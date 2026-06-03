# Implementation Plan: Play Music on Plexamp (Same Network)

**Branch**: `024-plexamp-network-playback` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-plexamp-network-playback/spec.md`

## Summary

Let users choose **This device** (existing Howler/browser playback) or any **Plex music player on the LAN** (Plexamp, Plex Web, HTPC, etc.) as the playback output. DexAudio discovers players via the connected PMS, proxies **remote control** and **Play Queue sync** through the backend (tokens stay server-side), polls remote status for Now Playing, **stops the remote player** when switching to local, **disables DexAudio Plex timeline reporting** while remote (feature 015), and **continues last.fm scrobbles** from logical session progress.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict); React 19 frontend; Node.js LTS backend.

**Primary Dependencies**: Existing stack — Fastify 5, Drizzle ORM, Zod/`@dexaudio/shared-types`, Zustand, TanStack Query, Howler (local path only), shadcn/ui. **No new runtime dependencies.**

**Storage**: `localStorage` for `PlaybackOutputPreference` only. PostgreSQL unchanged (reads `plex_connections`). No new tables v1.

**Testing**: Vitest — backend unit tests for `/clients` parsing, play queue builder, remote command URL mapping; integration tests with mocked Plex HTTP; frontend unit tests for output store, remote orchestrator, reporter gating, queue-sync debounce; MSW for player list + status poll.

**Target Platform**: PWA (evergreen browsers); backend proxies to PMS + LAN Plex clients.

**Project Type**: Web application (`frontend/` + `backend/` monorepo).

**Performance Goals**: Play on remote ≤5 s (SC-001); transport ≤2 s (SC-003); queue sync ≤5 s (FR-007); discovery ≤10 s (SC-009); status poll 3 s interval while remote active.

**Constraints**: REST `/api/v1` only; WCAG 2.1 AA on output selector; no WebSockets; cached blobs play only on **This device**; constitution V — no new npm packages.

**Scale/Scope**: Single-user household; typical 1–5 network players; queue length up to app max (~100 items) with player cap messaging.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass (N/A — no schema changes) |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — `Select`/`DropdownMenu`/`RadioGroup`, `Button`, `Toast` |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — output selector is composed shadcn primitives |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — `/plex/players`, remote control routes |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — Zod in `shared-types` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — see [playback-output-ui.md](./contracts/playback-output-ui.md) |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — local playback unchanged; remote fails soft |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass (N/A) |

**Post–Phase 1 re-check**: PASS — backend-mediated Plex APIs match existing auth/stream patterns; no constitutional exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/024-plexamp-network-playback/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── network-players-api.md
│   ├── remote-playback-control.md
│   └── playback-output-ui.md
└── tasks.md             # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── services/plex/
│   │   ├── plex-clients-service.ts       # NEW: GET /clients, filter, probe
│   │   ├── plex-remote-service.ts        # NEW: playMedia, transport, stop
│   │   ├── plex-playqueue-service.ts     # NEW: create/update playQueues
│   │   └── plex-player-status-service.ts # NEW: parse player state
│   └── api/routes/
│       └── plex-players.ts               # NEW: players, status, play, control, queue
└── tests/
    ├── unit/
    │   ├── plex-clients-service.test.ts
    │   ├── plex-playqueue-service.test.ts
    │   └── plex-remote-service.test.ts
    └── integration/
        └── plex-players.test.ts

frontend/
├── src/
│   ├── lib/
│   │   ├── playback-output-store.ts          # NEW: local + network preference
│   │   ├── network-playback-orchestrator.ts  # NEW: remote play/queue/sync/poll
│   │   └── plex-playback-reporter.ts         # MODIFY: gate when mode=network
│   ├── hooks/
│   │   └── use-player.ts                     # MODIFY: branch local vs remote
│   ├── contexts/
│   │   └── player-context.tsx                # MODIFY: register remote bridge
│   ├── components/
│   │   ├── playback/
│   │   │   └── PlaybackOutputSelector.tsx    # NEW
│   │   └── settings/
│   │       └── PlexSettingsSection.tsx       # MODIFY: reporting footnote
│   ├── pages/
│   │   └── NowPlayingPage.tsx                # MODIFY: embed selector
│   ├── services/
│   │   └── api-client.ts                     # MODIFY: player APIs
│   └── lib/
│       └── local-storage.ts                  # MODIFY: StorageKeys.playbackOutput
└── tests/
    └── unit/
        ├── playback-output-store.test.ts
        ├── network-playback-orchestrator.test.ts
        └── plex-playback-reporter.remote.test.ts

packages/shared-types/src/api/
└── schemas.ts                                # MODIFY: player DTOs + request bodies
```

**Structure Decision**: Web app with **backend-mediated Plex client APIs** (same security model as stream/timeline). Frontend adds a **parallel orchestration path** for network output while preserving existing `playback-orchestrator` + Howler path for local output.

## Complexity Tracking

> No constitutional violations. No new dependencies.

## Phase 0 & Phase 1 Artifacts

| Artifact | Status |
|----------|--------|
| [research.md](./research.md) | ✅ Complete |
| [data-model.md](./data-model.md) | ✅ Complete |
| [contracts/network-players-api.md](./contracts/network-players-api.md) | ✅ Complete |
| [contracts/remote-playback-control.md](./contracts/remote-playback-control.md) | ✅ Complete |
| [contracts/playback-output-ui.md](./contracts/playback-output-ui.md) | ✅ Complete |
| [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Notes (for `/speckit-tasks`)

### P1 — Discovery + output UI (US2 + US4 partial)

1. `plex-clients-service` + `GET /plex/players`.
2. `PlaybackOutputSelector` + `playback-output-store` + `StorageKeys.playbackOutput`.
3. Wire preference restore on app load; clear on Plex auth wipe.

### P1 — Remote play + stop on switch (US1)

4. `plex-remote-service` + `plex-playqueue-service` + routes (`play`, `control`, `switch-away`).
5. `network-playback-orchestrator`: on queue play/load, call play/sync instead of Howler when `mode=network`.
6. `player-context` / `use-player`: skip `loadTrack` audio when remote; still update queue index.
7. FR-013: `switch-away` on local selection.

### P1 — Queue mirror (US1 scenario 5)

8. Subscribe `playback-queue-store` → debounced `PUT .../queue` (revision counter).
9. Degraded fallback path + user toast (edge case).

### P2 — Now Playing sync (US3)

10. Poll `GET .../status` every 3 s; map to Now Playing + queue highlight.
11. Bi-directional: reflect external pause/skip on Plexamp.

### P2 — Reporting + scrobble (FR-015–020)

12. `plex-playback-reporter`: `canReport` false when `mode=network`.
13. `scrobble-tracker`: feed position from remote poll during network sessions.
14. Plex Settings copy for remote reporting delegation.

### P3 — Polish

15. Capability flags (`supportsSeek`, `supportsQueueSync`) in UI.
16. Long-queue cap messaging; offline cache → force local offer.

**Out of scope**: Manual IP entry; multi-tab session coordination; casting to non-Plex devices; GraphQL; new DB tables.
