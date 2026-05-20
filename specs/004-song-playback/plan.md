# Implementation Plan: Song Playback

**Branch**: `004-song-playback` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-song-playback/spec.md`

## Summary

Make audio playback actually work end-to-end. Today the queue loads and the Now Playing view renders, but clicking play never produces audible audio, and failures are completely silent. This plan covers: (1) fixing the `usePlayer` → Howler.js pipeline so loaded tracks auto-play, (2) adding Plex transcoding fallback for non-browser-native codecs (ALAC, WMA, WAV) via Plex's built-in transcode API, (3) expanding codec detection beyond flac/mp3 to include AAC/M4A and OGG/Opus, (4) building a structured error-handling system with user-visible toast notifications for per-track failures and inline banners for session-level failures, (5) handling browser autoplay policy blocks with a one-click "Play" affordance, (6) cancelling in-flight loads on rapid successive play actions to prevent overlapping audio, and (7) persisting volume across track transitions.

## Technical Context

**Language/Version**: TypeScript 5.x strict on both tiers; React 19.x (latest stable); Node.js 22.x LTS; PostgreSQL 16+

**Primary Dependencies**:
- **Frontend**: Vite, React 19, React Router 7, Howler.js 2.2.x (audio engine — already in tree), TanStack Query, Zustand (existing `playback-queue-store`), shadcn/ui (`Button`, `Slider`, `Toast`/`Sonner` for notifications) + Tailwind CSS, Vitest + Testing Library
- **Backend**: Fastify 5, Zod validation, Drizzle ORM + `drizzle-kit`, `pg`, Vitest + supertest
- **Shared**: `packages/shared-types` — existing Zod schemas (`Track`, `TrackFormat`, `ErrorBody`) to be extended

**Storage**: PostgreSQL — no new tables for this feature. Existing schema unchanged. Volume state stored in `localStorage` on the frontend (session-scoped, no server persistence needed).

**Testing**: Vitest in `frontend/` and `backend/`; unit tests for error classification, format detection, autoplay handling; component tests for error toast/banner UI; integration tests for the updated stream endpoint transcoding fallback

**Target Platform**: Modern Chromium/Firefox/Safari desktop browsers; installable PWA; responsive 320 px → desktop

**Project Type**: Web application (frontend + backend + shared-types monorepo) — same layout as features 001–003

**Performance Goals**:
- SC-001 — audible audio within 2 s of play action
- SC-006 — elapsed-time counter within ±1 s of audio position over 10 min
- SC-007 — median auto-advance time < 1 s
- SC-008 — zero overlapping audio on 5 rapid play actions in 1 s

**Constraints**:
- No new npm dependencies — Howler.js already in tree; shadcn/ui Toast already available; all error UI composed from existing primitives
- Plex transcoding via Plex's built-in API only — no app-side ffmpeg or similar
- Browser autoplay policy must be detected and handled gracefully
- Volume persisted in localStorage, survives track transitions within a session
- Constitution Principle V: YAGNI — no speculative error categories beyond what the spec defines

**Scale/Scope**: Single operator; one Plex library at a time; queue sizes up to ~500 tracks; audio streams up to ~50 MB per FLAC track

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass — React 19.x, TS strict (existing) |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — Node 22 LTS (existing) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — no new tables, no alternative stores |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — Toast/Sonner from shadcn/ui for error notifications; Button, Slider already in use |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — `PlaybackErrorBanner` and `PlaybackErrorToast` are thin composites of shadcn Toast + existing UI primitives |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — existing `/api/v1/stream/:trackId` endpoint modified; no new non-REST protocols |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — `TrackFormat` enum and `ErrorBody` schema extended in `packages/shared-types` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — error notifications use ARIA live regions; all controls have accessible labels (existing AudioPlayer already has aria-labels) |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — cached tracks continue to play offline; error messages distinguish network failures from other causes |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — error banner uses responsive layout; AudioPlayer already responsive |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass — zero new npm dependencies; reuses Howler.js, shadcn/ui Toast, Zustand already in tree |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass — nothing to document |

**Post-design re-check** (after Phase 1): All gates remain ✅. No constitution violations introduced by the data model, REST contract updates, error type definitions, or UI composition. Zero new dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/004-song-playback/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   └── openapi.yaml
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/
└── shared-types/
    └── src/api/schemas.ts          # Modified — extend TrackFormat enum, add PlaybackError schemas

backend/
├── src/
│   ├── api/routes/
│   │   └── stream.ts              # Modified — add Plex transcoding fallback, expand format detection
│   ├── services/plex/
│   │   └── plex-client.ts         # Modified — add getTranscodeUrl(), expand parseTrackFromMetadata format detection
│   └── lib/
│       └── errors.ts              # Existing — reuse AppError, BadGatewayError, UnauthorizedError
└── tests/
    ├── unit/
    │   ├── stream-format-detection.test.ts     # New — codec → format mapping
    │   └── stream-transcode-fallback.test.ts   # New — transcode URL generation
    └── integration/
        └── stream-transcode.test.ts            # New — end-to-end transcode fallback

frontend/
├── src/
│   ├── components/player/
│   │   ├── AudioPlayer.tsx                    # Modified — add error display slot, cover art
│   │   └── PlaybackErrorBanner.tsx            # New — inline banner for session-level errors
│   ├── components/ui/
│   │   └── sonner.tsx                         # Add if not present — shadcn/ui toast wrapper
│   ├── hooks/
│   │   └── use-player.ts                      # Modified — auto-play on load, error events, autoplay detection,
│   │                                          #   rapid-click cancellation, volume persistence, mid-stream recovery
│   ├── lib/
│   │   └── playback-errors.ts                 # New — error classification, category → user message mapping
│   ├── pages/
│   │   └── NowPlayingPage.tsx                 # Modified — wire error state, error banner, toast notifications,
│   │                                          #   auto-skip logic, all-failed terminal message
│   └── stores/
│       └── playback-queue-store.ts            # Modified — add skip-tracking for auto-skip + all-failed detection
└── tests/
    └── unit/
        ├── playback-errors.test.ts            # New — error classification unit tests
        ├── use-player-autoplay.test.ts         # New — autoplay policy handling
        └── use-player-rapid-click.test.ts      # New — rapid click cancellation
```

**Structure Decision**: Extends the existing web-app monorepo layout. All changes are modifications to existing files or thin new modules co-located with existing code. The major work is in `use-player.ts` (the audio engine hook) and `NowPlayingPage.tsx` (the view that orchestrates playback). Backend changes are scoped to the stream endpoint and Plex client. No new top-level directories.

## Complexity Tracking

No constitution violations. No new dependencies.

| Violation / exception | Why Needed | Simpler Alternative Rejected Because |
|----------------------|------------|--------------------------------------|
| *(none)* | — | — |

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | ✅ Complete |
| Data model | [data-model.md](./data-model.md) | ✅ Complete |
| REST contract | [contracts/openapi.yaml](./contracts/openapi.yaml) | ✅ Complete |
| Quickstart | [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Phases (high level — detail in tasks.md)

### Phase 2+ (out of scope for `/speckit-plan`)

1. **Shared types**: Extend `TrackFormat` enum to include `aac`, `ogg`, `wav`, `alac`, `wma`; add `PlaybackErrorCategory` enum and `PlaybackFailure` type to `packages/shared-types`.
2. **Backend format detection**: Expand `parseTrackFromMetadata` in `plex-client.ts` to detect AAC/M4A, OGG/Opus, WAV, ALAC, WMA codecs.
3. **Backend transcoding fallback**: Update `/api/v1/stream/:trackId` to construct a Plex transcode URL when the native stream returns a non-browser-decodable format; proxy the transcoded stream.
4. **Frontend `usePlayer` overhaul**: Auto-play on `loadTrack`; register Howler `onerror`/`onloaderror` events; detect autoplay policy blocks; cancel prior Howl on rapid play actions; persist volume in localStorage.
5. **Error classification**: New `playback-errors.ts` module that maps Howler error codes + HTTP status codes to user-facing error categories (unsupported format, server unreachable, auth expired, track not found, network interrupted, autoplay blocked, unknown).
6. **Error UI — toasts**: Per-track auto-skip failures shown as non-blocking toast notifications via shadcn/ui Sonner.
7. **Error UI — inline banner**: Session-level failures (auth, network, server) shown as inline banners in the Now Playing view with action affordances (Retry, Sign in, Back to library).
8. **NowPlayingPage orchestration**: Wire error state from `usePlayer` into the view; implement auto-skip with notification for individual failures; implement blocking prompt for session-level failures; handle all-failed-queue terminal state.
9. **Now Playing state accuracy**: Ensure elapsed time counter, play/pause indicator, track metadata, and queue position are always in sync with Howler state.
10. **Tests**: Backend unit tests for format detection and transcode URL construction; frontend unit tests for error classification, autoplay detection, rapid-click cancellation; component tests for error toast/banner rendering.

**Next command**: `/speckit-tasks` to generate the dependency-ordered `tasks.md`.
