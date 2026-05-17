# Dexaudio local dev (Windows PowerShell)
# Run from repo root: .\scripts\start-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Write-Step "Installing dependencies"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Starting PostgreSQL (Docker)"
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker failed. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Step "Waiting for Postgres"
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    docker compose exec -T postgres pg_isready -U dexaudio 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    Write-Host "Postgres did not become ready in time." -ForegroundColor Red
    exit 1
}

Write-Step "Backend .env"
$backendEnv = Join-Path $Root "backend\.env"
$backendExample = Join-Path $Root "backend\.env.example"
if (-not (Test-Path $backendEnv)) {
    Copy-Item $backendExample $backendEnv
    Write-Host "Created backend\.env - set APP_SECRET to at least 32 characters." -ForegroundColor Yellow
}

# Ensure APP_SECRET is long enough for Zod validation
$envContent = Get-Content $backendEnv -Raw
if ($envContent -notmatch "APP_SECRET=.+" -or ($envContent -match "APP_SECRET=(.+)" -and $Matches[1].Length -lt 32)) {
    $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
    if ($envContent -match "APP_SECRET=.*") {
        $envContent = $envContent -replace "APP_SECRET=.*", "APP_SECRET=$secret"
    } else {
        $envContent += "`nAPP_SECRET=$secret"
    }
    Set-Content -Path $backendEnv -Value $envContent.TrimEnd()
    Write-Host "Generated APP_SECRET in backend\.env" -ForegroundColor Yellow
}

Write-Step "Running database migration"
$sqlPath = Join-Path $Root "backend\drizzle\0000_init.sql"
Get-Content $sqlPath -Raw | docker compose exec -T postgres psql -U dexaudio -d dexaudio -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration may have partially applied (safe to re-run CREATE IF NOT EXISTS)." -ForegroundColor Yellow
}

Write-Step "Building shared-types"
npm run build -w packages/shared-types
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Starting API (port 3001) and UI (port 5173) in new windows"
$backendCmd = "Set-Location '$Root'; npm run dev -w backend"
$frontendCmd = "Set-Location '$Root'; npm run dev -w frontend"

$shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }
Start-Process $shell -ArgumentList @("-NoExit", "-Command", $backendCmd)
Start-Sleep -Seconds 2
Start-Process $shell -ArgumentList @("-NoExit", "-Command", $frontendCmd)

Write-Host ""
Write-Host "Open http://localhost:5173" -ForegroundColor Green
Write-Host "First-time Plex setup: http://localhost:5173/setup" -ForegroundColor Green
Write-Host "API health: http://localhost:3001/api/v1/health" -ForegroundColor Green
