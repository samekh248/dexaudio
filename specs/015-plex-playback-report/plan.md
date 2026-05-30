# Implementation Plan: Plex Playback Reporting

**Branch**: `015-plex-playback-report` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-plex-playback-report/spec.md`

## Summary

Dexaudio plays Plex library audio but does not report playback to the Plex server, so Plex activity, Recently Played, and in-app Top 10 stats miss sessions from this app. The feature adds **native Plex timeline lifecycle reporting** (start → progress heartbeats → pause/resume → stop) for Plex-sourced tracks only, with client identity **DexAudio**, a **Plex Settings** toggle (default on), and a **24-hour retry outbox** when the server is unreachable—without blocking playback.

Technical approach: extend the **backend** to proxy `GET /:/timeline` to the user’s Plex server (tokens stay server-side), add a **`plex_timeline_outbox`** table and REST endpoints parallel to Last.fm scrobbling, extend **`AppSettings`** with `plexPlaybackReporting.enabled`, and wire a new **`plex-playback-reporter`** module into **`use-player.ts`** at the same lifecycle hooks as the scrobble tracker. Rename `PLEX_PRODUCT_NAME` to **`DexAudio`** to match the spec.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict); React 19 frontend; Node.js LTS backend.

**Primary Dependencies**: Existing stack only — Fastify 5, Drizzle ORM, Zod/`@dexaudio/shared-types`, React 19, Zustand, TanStack Query, shadcn/ui. **No new runtime dependencies.**

**Storage**: PostgreSQL — new `plex_timeline_outbox` table; `app_settings` key `plexPlaybackReporting`. Reads `plex_connections` for server URL, token, `machineIdentifier`.

**Testing**: Vitest — unit tests for timeline URL builder and outbox; integration tests mocking Plex `:/timeline`; frontend unit tests for reporter gating and session key rotation.

**Target Platform**: PWA (evergreen browsers); backend proxies to user’s Plex Media Server.

**Project Type**: Web application (`frontend/` + `backend/` monorepo).

**Performance Goals**: State-change reports visible on Plex within **10 s** (FR-001–FR-004); progress heartbeats every **10 s** while playing; seek updates within **3 s** after debounce.

**Constraints**: Reporting must not block audio (FR-012); disabled via settings returns no-op; failed posts queue ≤24 h; `Track.id` is Plex `ratingKey`; multi-tab coordination out of scope.

**Scale/Scope**: Single listener per tab; ~1 timeline request per 10 s per active play plus burst on transitions; touches 1 new DB table, ~4 backend modules, 2 frontend modules, Plex Settings UI.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — `plex_timeline_outbox` only |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — Switch, Label, Alert in Plex Settings |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass (N/A) |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — `POST /plex/timeline`, status/retry |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — Zod in `shared-types` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — toggle labeled; status text readable |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — reporting fails soft; playback unchanged |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — settings section only |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass (N/A) |

**Post–Phase 1 re-check**: PASS — design uses existing Plex client headers and settings patterns; no constitutional exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/015-plex-playback-report/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── plex-timeline-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── lib/
│   │   └── config.ts                          # MODIFY: PLEX_PRODUCT_NAME → DexAudio
│   ├── db/
│   │   └── schema.ts                          # MODIFY: plex_timeline_outbox table
│   ├── services/
│   │   └── plex/
│   │       ├── plex-timeline-service.ts         # NEW: build URL, call /:/timeline
│   │       └── plex-timeline-outbox.ts        # NEW: enqueue, flush, drop expired
│   ├── services/settings/
│   │   └── settings-repository.ts             # MODIFY: default plexPlaybackReporting
│   └── api/routes/
│       └── plex.ts                              # MODIFY: timeline + reporting routes
└── tests/
    ├── unit/
    │   └── plex-timeline-service.test.ts      # NEW
    └── integration/
        └── plex-timeline.test.ts              # NEW

frontend/
├── src/
│   ├── lib/
│   │   └── plex-playback-reporter.ts          # NEW
│   ├── hooks/
│   │   └── use-player.ts                      # MODIFY: wire reporter
│   ├── services/
│   │   └── api-client.ts                      # MODIFY: timeline + status APIs
│   └── components/settings/
│       └── PlexSettingsSection.tsx            # MODIFY: toggle + health
└── tests/
    └── unit/
        └── plex-playback-reporter.test.ts     # NEW

packages/shared-types/src/api/
└── schemas.ts                                 # MODIFY: Timeline + AppSettings types
```

**Structure Decision**: Web app with backend-mediated Plex API calls (same as auth, library, stream). Frontend reporter is a thin, testable module invoked from the consolidated `use-player` lifecycle (post-014), analogous to `scrobble-tracker.ts`.

## Complexity Tracking

> No constitutional violations. No new dependencies.

## Phase 0 & Phase 1 Artifacts

| Artifact | Status |
|----------|--------|
| [research.md](./research.md) | ✅ Complete |
| [data-model.md](./data-model.md) | ✅ Complete |
| [contracts/plex-timeline-api.md](./contracts/plex-timeline-api.md) | ✅ Complete |
| [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Notes (for `/speckit-tasks`)

1. **P1 — Backend timeline + outbox**: schema migration, `plex-timeline-service`, routes, unit/integration tests.
2. **P1 — Frontend reporter**: hook into `use-player` (play/pause/seek/end/skip), 10 s heartbeat, session key per track.
3. **P2 — Settings**: `plexPlaybackReporting` in `AppSettings`, Plex Settings toggle + status + retry button.
4. **P2 — Product name**: `PLEX_PRODUCT_NAME = "DexAudio"` for all Plex HTTP (auth, library, timeline).
5. **P3 — Reset/wipe**: include timeline outbox in settings reset targets if applicable.

**Out of scope**: Last.fm changes; multi-tab session deduplication; custom play-count thresholds; GraphQL.
