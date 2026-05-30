# Implementation Plan: Robust, Reliable Music Playback

**Branch**: `014-robust-playback` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-robust-playback/spec.md`

## Summary

The music player's playback layer is unreliable: there is no buffering/stall recovery, error/retry handling is ad-hoc, queue↔engine orchestration is split across three modules with a fragile two-step handoff that can double-advance, crossfade is incomplete and reads its preference only once, live-stream seeking is unreliable because the proxy never forwards byte-range requests, and the core engine has effectively no automated tests.

The technical approach is a **refactor (not a rewrite)** of the existing Howler.js-based engine into a small, explicit playback **state machine** behind a testable **audio-engine adapter**, with a single orchestration owner for queue↔engine sync. We add a centralized **recovery policy** (≤3 retries with backoff, ~10s stall tolerance) driven by native HTML5 media events, make playback preferences **reactive** via the existing store pattern, complete **true overlapping crossfade** by reusing the staged-Howl infrastructure (no new dependencies), and extend the backend stream proxy to **forward `Range` requests** end-to-end so seeking is reliable on live streams. Comprehensive unit/integration tests around the engine, recovery, transitions, and the proxy close the regression gap.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict) on both ends; React 19 frontend, Node.js latest LTS backend.

**Primary Dependencies**: Frontend — React 19, Howler.js 2.2.4 (HTML5 mode), Zustand 5, TanStack Query 5, React Router 7, shadcn/ui + Tailwind 3, Vite 6, `vite-plugin-pwa`. Backend — Fastify 5, Drizzle ORM, `zod`. Shared — `@dexaudio/shared-types`. **No new runtime dependencies are introduced.**

**Storage**: PostgreSQL (backend, unchanged for this feature — the stream route is stateless). Client-side: IndexedDB audio cache (existing `cache-service`) and `localStorage` for playback session + preferences (existing `local-storage` keys).

**Testing**: Vitest 2 + Testing Library + jsdom (frontend); Vitest 2 + `supertest` (backend). MSW for API mocking. New: a fake audio-engine adapter to make the engine state machine deterministically testable.

**Target Platform**: Offline-first PWA in evergreen browsers (desktop + mobile), 320 px and up; same-origin Fastify API at `/api/v1/…` proxying Plex.

**Project Type**: Web application (separate `frontend/` and `backend/` packages in a workspace).

**Performance Goals**: Audible start ≤ 2 s for ≥99% of plays (SC-001); seek settles ≤ 1 s for ≥99% (SC-007); automatic recovery for ≥95% of transient interruptions (SC-003); zero double-advances (SC-004); position UI update cadence ≤ 250 ms.

**Constraints**: Recovery budget ≈10 s of buffering/stall and ≤3 retries with backoff before final failure; final failure auto-advances (stops only at queue exhaustion); transition-preference changes take effect on the next transition without reload; must not regress existing gapless, caching/pre-cache, session restore, or autoplay-unblock behavior; no new libraries (Constitution V).

**Scale/Scope**: Single active listener per client session; queues up to a few thousand tracks; refactor touches ~6 frontend modules and 1 backend route plus new tests. Not in scope: changing the Plex source provider, multi-device sync, or audio DSP beyond crossfade volume ramps.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass — React 19 + TS strict retained; no version change. |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — Fastify 5 / TS strict retained. |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass (N/A) — no DB changes; stream proxy is stateless. IndexedDB/localStorage are pre-existing client caches, not new datastores. |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — reuses existing transition/settings UI and error banner; any minor surface uses existing shadcn primitives. |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass (N/A) — no new custom components. |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — same `GET /api/v1/stream/:trackId`; adds standard HTTP Range/206 semantics. |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — `PlaybackFailure` and transition/recovery types live in `@dexaudio/shared-types`. |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — failure notices and controls remain keyboard-accessible with `aria-live` for non-blocking notices. |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — cache-first fallback to live source is strengthened, not removed. |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — no layout changes that affect breakpoints. |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass — crossfade uses existing Howler fade/two-instance overlap; recovery uses native media events. No new deps. |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass (N/A) — none added. |

**Result**: PASS. No violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/014-robust-playback/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── stream-range-api.md
│   ├── audio-engine.md
│   └── playback-preferences.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (already created)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── api/routes/
│       └── stream.ts                 # MODIFY: forward Range → 206 Partial Content
└── tests/
    └── integration/
        └── stream-range.test.ts      # NEW: Range/206 + fallback proxy behavior

frontend/
├── src/
│   ├── hooks/
│   │   ├── use-player.ts             # MODIFY: state machine + recovery + crossfade
│   │   └── use-playback-controls.ts  # MODIFY: unified next/prev/handoff
│   ├── contexts/
│   │   └── player-context.tsx        # MODIFY: single orchestration owner (no double-advance)
│   ├── lib/
│   │   ├── audio-engine.ts           # NEW: Howler adapter + interface (testable seam)
│   │   ├── playback-machine.ts       # NEW: pure state-machine transitions
│   │   ├── recovery-policy.ts        # NEW: retry/backoff/stall constants + helpers
│   │   ├── playback-errors.ts        # MODIFY: classify stall/recoverable vs final
│   │   ├── stream-audio.ts           # (mostly unchanged) URL/format helpers
│   │   └── playback-prefs-store.ts   # NEW: reactive transition/crossfade prefs (Zustand)
│   ├── stores/
│   │   └── playback-queue-store.ts   # (mostly unchanged) queue source of truth
│   └── pages/
│       └── NowPlayingPage.tsx        # MODIFY: rely on engine auto-advance; fix effect deps
└── tests/
    └── unit/
        ├── playback-machine.test.ts          # NEW
        ├── recovery-policy.test.ts           # NEW
        ├── use-player.engine.test.ts         # NEW (fake adapter)
        ├── use-player.recovery.test.ts       # NEW (fake adapter)
        ├── use-player.crossfade.test.ts      # NEW
        ├── player-context.orchestration.test.tsx # NEW (no double-advance)
        └── playback-prefs-store.test.ts      # NEW
```

**Structure Decision**: Web application with existing `frontend/` (React PWA) and `backend/` (Fastify proxy) packages. The refactor introduces a thin, testable seam (`audio-engine.ts` adapter + pure `playback-machine.ts`) so the engine's lifecycle/recovery logic can be unit-tested without a real browser audio element, while preserving the public `usePlayer()` / `usePlaybackControls()` surface consumed by existing UI. The backend change is confined to the existing stream route.

## Complexity Tracking

> No constitutional violations. No new dependencies. Section intentionally empty.
