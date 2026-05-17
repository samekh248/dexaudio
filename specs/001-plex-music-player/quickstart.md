# Quickstart: Plex Music Player (001-plex-music-player)

**Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/openapi.yaml](./contracts/openapi.yaml)

## Prerequisites

- Node.js **22.x LTS** and npm **10+**
- Docker (for local PostgreSQL)
- A Plex server with a music library (FLAC/MP3)
- Optional: Discogs API token, Last.fm API key

## 1. Clone and install

```bash
cd /workspace
npm install
```

> Monorepo workspaces (`frontend`, `backend`, `packages/shared-types`) are created during `/speckit-implement`.

## 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

Default connection (documented in `.env.example` after scaffold):

```text
DATABASE_URL=postgresql://dexaudio:dexaudio@localhost:5432/dexaudio
APP_SECRET=<32+ char random secret for credential encryption>
```

## 3. Configure backend

```bash
cp backend/.env.example backend/.env
# Edit: DATABASE_URL, APP_SECRET, optional GRAPHQL_ENABLED=true
```

Run migrations:

```bash
npm run db:migrate -w backend
```

## 4. Run development servers

```bash
# Terminal A — API on :3001
npm run dev -w backend

# Terminal B — UI on :5173
npm run dev -w frontend
```

Open http://localhost:5173

## 5. First-time setup flow

1. **Settings → Plex Server** — enter server URL and Plex token; save (validates via `PUT /api/v1/plex/connection`).
2. Select active music libraries.
3. Browse **album grid** (default landing); use **Play now** / **Add to queue**.
4. Optional: **Appearance** (theme), **Playback** (auto-queue, crossfade, pre-cache N), **Storage** (cache caps).
5. Optional: **Last.fm**, **Discogs** sections per spec.

## 6. PWA install (desktop)

1. Build frontend: `npm run build -w frontend`
2. Serve with HTTPS (required for install) or use `npm run preview -w frontend` behind TLS proxy.
3. Use browser “Install app” / “Add to Dock”.

## 7. Run tests with coverage (80% gate)

```bash
npm run test:coverage -w frontend
npm run test:coverage -w backend
```

CI fails if lines, functions, or branches fall below **80%**.

## 8. API exploration

- REST: import [contracts/openapi.yaml](./contracts/openapi.yaml) into Swagger UI or Bruno.
- GraphQL (optional): `GRAPHQL_ENABLED=true` → POST `http://localhost:3001/graphql` with Playground when enabled in dev.

Example REST health check:

```bash
curl -s http://localhost:3001/api/v1/health
```

## Key architecture reminders

| Concern | Where |
|---------|--------|
| Plex token | PostgreSQL encrypted; never in `localStorage` |
| Theme / playback prefs | `localStorage` |
| Audio cache blobs | IndexedDB |
| Pending scrobbles | IndexedDB + PostgreSQL outbox |
| Primary API | REST `/api/v1/*` |
| Optional reads | GraphQL (feature flag) |

## Next steps

Run `/speckit-tasks` to generate implementation tasks, then `/speckit-implement`.
