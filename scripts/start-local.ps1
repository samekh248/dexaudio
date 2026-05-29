# Dexaudio local dev (Windows PowerShell)
# Run from repo root: .\scripts\start-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

function Invoke-Silent {
    param([scriptblock]$Command)
    # Native stderr becomes ErrorRecords; suppress so Stop doesn't terminate probes.
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        & $Command 1>$null 2>$null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorAction
    }
}

function Test-DockerReady {
    return (Invoke-Silent { docker info }) -eq 0
}

function Ensure-DockerRunning {
    if (Test-DockerReady) { return }

    $dockerDesktop = Join-Path ${env:ProgramFiles} "Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $dockerDesktop)) {
        Write-Host "Docker is not running and Docker Desktop was not found at:`n  $dockerDesktop" -ForegroundColor Red
        Write-Host "Install Docker Desktop and try again." -ForegroundColor Red
        exit 1
    }

    $dockerDesktopRunning = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
    if ($dockerDesktopRunning) {
        Write-Host "Docker Desktop is running but the engine is not ready yet. Waiting..." -ForegroundColor Yellow
    } else {
        Write-Host "Docker is not running. Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process $dockerDesktop | Out-Null
    }

    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        if (Test-DockerReady) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        Write-Host "Docker did not become ready within 2 minutes." -ForegroundColor Red
        exit 1
    }
    Write-Host "Docker is ready." -ForegroundColor Green
}

Write-Step "Ensuring Docker is running"
Ensure-DockerRunning

Write-Step "Installing dependencies"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Starting PostgreSQL (Docker)"
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
try {
    docker compose up -d postgres
    $composeExit = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorAction
}
if ($composeExit -ne 0) {
    Write-Host "Docker failed. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Step "Waiting for Postgres"
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    if ((Invoke-Silent { docker compose exec -T postgres pg_isready -U dexaudio }) -eq 0) {
        $ready = $true
        break
    }
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

Write-Step "Running database migrations"
Get-ChildItem (Join-Path $Root "backend\drizzle\*.sql") | Sort-Object Name | ForEach-Object {
    Write-Host "  Applying $($_.Name)" -ForegroundColor DarkGray
    $migrationFile = $_
    $exitCode = Invoke-Silent {
        Get-Content $migrationFile.FullName -Raw | docker compose exec -T postgres psql -U dexaudio -d dexaudio -q
    }
    if ($exitCode -ne 0) {
        Write-Host "Migration $($_.Name) may have partially applied (safe to re-run)." -ForegroundColor Yellow
    }
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
