# Quickstart: Song Playback (Feature 004)

## What This Feature Does

Makes audio playback work end-to-end in Dexaudio. Before this feature, clicking play loads the queue but produces no audible audio. After this feature, clicking play on any track starts audio within 2 seconds, with clear error messages when something goes wrong.

## Prerequisites

- Features 001 (Plex Music Player), 002 (Plex Auth), and 003 (Albums Library View) are implemented
- Plex server is connected with at least one music library synced
- Node.js 22 LTS, PostgreSQL 16+ running
- `npm install` completed in all workspace packages

## Dev Setup

```bash
# From repo root — start backend + frontend
cd backend && npm run dev &
cd frontend && npm run dev &
```

No new environment variables. No new database migrations. No new npm dependencies.

## Key Files to Know

| File | Role |
|------|------|
| `frontend/src/hooks/use-player.ts` | Core audio engine hook (Howler.js wrapper) — main modification target |
| `frontend/src/pages/NowPlayingPage.tsx` | View orchestrating playback, error display, auto-skip |
| `frontend/src/lib/playback-errors.ts` | Error classification and user-message mapping (new) |
| `frontend/src/components/player/PlaybackErrorBanner.tsx` | Inline error banner for session-level failures (new) |
| `backend/src/api/routes/stream.ts` | Audio stream proxy — modified for transcode fallback |
| `backend/src/services/plex/plex-client.ts` | Plex API client — modified for format detection + transcode URL |
| `packages/shared-types/src/api/schemas.ts` | Shared Zod schemas — extended with new types |

## Testing a Change

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## Manual Smoke Test

1. Navigate to the albums home page (`/`)
2. Click the play overlay on any album card
3. Verify: audio begins playing within 2 seconds
4. Verify: Now Playing view shows correct track title, artist, album
5. Verify: elapsed time counter advances in sync with audio
6. Wait for track to end — verify next track auto-advances
7. Test error path: disconnect from network, verify error banner appears

## Architecture Overview

```
User clicks Play
       │
       ▼
NowPlayingPage.useEffect (on track change)
       │
       ▼
usePlayer.loadTrack(track, onEnd)
       │
       ├─► readFromCache(trackId) ─► if cached, use blob URL
       │
       └─► /api/v1/stream/{trackId}
              │
              ▼
         stream.ts (backend)
              │
              ├─► Direct play (browser-native codec)
              │     └─► proxy raw bytes from Plex
              │
              └─► Transcode fallback (non-native codec)
                    └─► proxy transcoded MP3 from Plex universal transcode
              │
              ▼
         new Howl({ src, html5: true })
              │
              ├─► howl.play()  ─► audio output
              │
              ├─► onloaderror  ─► classify error ─► toast or banner
              │
              └─► onplayerror  ─► detect autoplay block ─► show Play button
```
