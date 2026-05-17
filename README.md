# Dexaudio — Plex Music Player

PWA-capable web music player that streams FLAC/MP3 from Plex, with Discogs collection matching, Last.fm scrobbling, and on-device caching.

## Quick start

```bash
npm install
docker compose up -d postgres
cp .env.example backend/.env
# Set APP_SECRET (32+ chars) and DATABASE_URL in backend/.env
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

```bash
npm run test:coverage -w frontend
npm run test:coverage -w backend
```

## Documentation

Feature spec and architecture: [`specs/001-plex-music-player/`](specs/001-plex-music-player/)
