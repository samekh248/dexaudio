# Dexaudio — Plex Music Player

PWA-capable web music player that streams FLAC/MP3 from Plex, with Discogs collection matching, Last.fm scrobbling, and on-device caching.

## Quick start

### Windows (PowerShell)

From the repo root in **PowerShell** (requires [Node.js 22](https://nodejs.org/) and [Docker Desktop](https://www.docker.com/products/docker-desktop/)):

```powershell
.\scripts\start-local.ps1
```

That script installs packages, starts Postgres, migrates the DB, builds shared types, and opens two terminals for the API (`:3001`) and UI (`:5173`).

**Manual steps** (if you prefer separate terminals):

```powershell
npm install
docker compose up -d postgres
Copy-Item backend\.env.example backend\.env
# Edit backend\.env: APP_SECRET must be at least 32 characters
Get-Content backend\drizzle\0000_init.sql -Raw | docker compose exec -T postgres psql -U dexaudio -d dexaudio
npm run build -w packages/shared-types
npm run dev -w backend    # terminal 1 — http://localhost:3001
npm run dev -w frontend   # terminal 2 — http://localhost:5173
```

### Linux / macOS (bash)

```bash
npm install
docker compose up -d postgres
cp backend/.env.example backend/.env
# Set APP_SECRET (32+ chars) in backend/.env
PGPASSWORD=dexaudio psql -h localhost -U dexaudio -d dexaudio -f backend/drizzle/0000_init.sql
npm run build -w packages/shared-types
npm run dev -w backend   # :3001
npm run dev -w frontend  # :5173
```

Open http://localhost:5173 and connect Plex under **Settings** or `/setup`.

## Monorepo

| Package | Description |
|---------|-------------|
| `frontend/` | React 19 + Vite + shadcn/ui PWA |
| `backend/` | Fastify REST API + optional GraphQL |
| `packages/shared-types/` | Zod DTOs shared across tiers |

## Tests (80% coverage gate)

```powershell
npm run test:coverage -w frontend
npm run test:coverage -w backend
```

## Documentation

Feature spec and architecture: [`specs/001-plex-music-player/`](specs/001-plex-music-player/)
