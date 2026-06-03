# Implementation Plan: Queue Management

**Branch**: `025-queue-management` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-queue-management/spec.md`

## Summary

Improve in-session queue UX and playback readiness: split the queue list into a **played window** (up to three tracks before current), **pinned current**, and **upcoming** rows; enable **drag reorder** for upcoming-only rows without new dependencies; show **thin per-row buffer progress** for staged preparations; and **extend staged preloading** to honor a user-configurable **preparation depth** (default three tracks) with earlier starts for lossless successors—building on `playback-queue-store`, `QueuePanel`, `playback-orchestrator`, and the existing single-slot `preloadStaged` path in `use-player.ts`.

No backend or REST contract changes. Re-anchor on backward selection uses existing `setIndex` + `loadGeneration`; display trimming is UI-only.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict) — React 19 frontend; Node.js LTS backend unchanged.

**Primary Dependencies**: React 19, Zustand 5, Howler.js 2.2.4 (via `audio-engine.ts`), shadcn/ui + Tailwind 3, Vite 6, existing `playback-orchestrator.ts`, `playback-queue-store.ts`, `playback-prefs-store.ts`, `pre-cache-worker.ts`. **No new runtime dependencies** (native HTML5 drag-and-drop for reorder; see research.md).

**Storage**: `localStorage` via `StorageKeys` for new `queuePrepDepth` preference (client-only, same pattern as gapless/crossfade/lossless). Queue session persistence remains `010-queue-playback-cache` (unchanged).

**Testing**: Vitest 2 + Testing Library — unit tests for pure queue segmentation/reorder guards, orchestrator depth scheduling, prep state store, and `QueuePanel` interaction; extend player/orchestrator mocks where needed.

**Target Platform**: PWA in evergreen browsers (320 px+); queue UI on `NowPlayingPage` (`QueuePanel`).

**Project Type**: Web application (`frontend/` primary; `backend/` N/A for this feature).

**Performance Goals**: SC-003 — ≤500 ms gap to next track on home broadband (95%); SC-004 — ≤1.5 s on throttled mobile profile (90%); buffer indicator complete before handoff (SC-005, 90%); reorder task ≤5 s desktop / ≤8 s touch (SC-002).

**Constraints**: Constitution V — no `@dnd-kit` or other new libraries; WCAG 2.1 AA — keyboard-accessible reorder alternative; current row not draggable; played rows not removable; max three visible played rows; prep depth configurable (min 1, default 3); lossless earlier preload within three queue positions; retarget prep within 1 s after skip/reorder (FR-014).

**Scale/Scope**: Single listener session; typical queues &lt;100 visible rows; touch ~8 frontend modules + contracts + tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass (N/A — no backend changes) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass (N/A) |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — `Separator`, `Progress` (or thin custom bar via Tailwind), existing `Button` |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — thin in-row buffer bar is feature-specific layout on shadcn primitives |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ Pass (N/A) |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass (N/A) — client-only pref shape in contracts |
| Frontend meets WCAG 2.1 AA | IV. Frontend Quality | ✅ Pass — keyboard reorder actions + `aria-grabbed` / live region for drag |
| Frontend is offline-first PWA | IV. Frontend Quality | ✅ Pass — staged prep uses existing cache/stream resolution |
| Responsive layout 320 px–desktop | IV. Frontend Quality | ✅ Pass — queue panel scroll + touch long-press drag |
| No new libraries without explicit request | V. Simplicity & Restraint | ✅ Pass — native DnD + pointer handlers |
| New dependencies in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass (N/A) |

**Post–Phase 1 re-check**: PASS — design stays within existing packages and patterns.

## Project Structure

### Documentation (this feature)

```text
specs/025-queue-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── queue-display.md
│   ├── queue-preparation.md
│   └── queue-reorder.md
└── tasks.md             # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── queue/
│   │   │   ├── QueuePanel.tsx              # MODIFY: sections, buffer bar, DnD, a11y
│   │   │   └── QueueRow.tsx                # NEW (optional extract): row + prep bar
│   │   └── settings/
│   │       └── PlaybackSettingsSection.tsx # MODIFY: prep depth control
│   ├── lib/
│   │   ├── queue-display.ts                # NEW: played window, section slices
│   │   ├── queue-prep-store.ts             # NEW: per-track prep status for UI
│   │   ├── playback-orchestrator.ts        # MODIFY: multi-depth preload, lossless lead, all transitions
│   │   ├── playback-prefs-store.ts         # MODIFY: queuePrepDepth pref
│   │   └── local-storage.ts                # MODIFY: StorageKeys.queuePrepDepth
│   ├── hooks/
│   │   └── use-player.ts                   # MODIFY: staged pool by trackId, prep progress events
│   ├── contexts/
│   │   └── player-context.tsx              # MODIFY: expose prep snapshot / cancel on reorder
│   ├── pages/
│   │   └── NowPlayingPage.tsx              # MODIFY: wire reorder, displayIndex, prep subscription
│   └── stores/
│       └── playback-queue-store.ts         # MODIFY: reorder guard + currentIndex fix when needed
└── tests/
    └── unit/
        ├── queue-display.test.ts           # NEW
        ├── queue-prep-store.test.ts        # NEW
        ├── queue-reorder.test.ts             # NEW
        ├── playback-orchestrator.prep.test.ts # NEW
        └── QueuePanel.test.tsx             # NEW
```

**Structure Decision**: Frontend-only changes in the existing PWA package. Orchestrator and `use-player` own preparation depth and timing; pure `queue-display.ts` keeps UI segmentation testable; `queue-prep-store` bridges staged engines to `QueuePanel` without prop-drilling through Howler internals.

## Complexity Tracking

> No constitutional violations. No new dependencies.
