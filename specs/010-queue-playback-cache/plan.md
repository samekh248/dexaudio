# Implementation Plan: Queue and Now Playing Persistence

**Branch**: `010-queue-playback-cache` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-queue-playback-cache/spec.md`

## Summary

Persist the playback **queue**, **current track index**, and **elapsed position** to `localStorage` so they survive tab reload and browser restarts. On load, **hydrate** Zustand and player UI from the snapshot but **never auto-start audio**—users press play to resume. Clear the snapshot on Plex sign-out, data wipe, or **active library change**. Frontend-only; no backend changes.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19.x; Node.js 22.x LTS (tests only)

**Primary Dependencies**:
- **Frontend**: Zustand (`playback-queue-store`), existing `localStorage` helpers, Howler via `use-player`, `sonner` toasts, `@dexaudio/shared-types` `Track`
- **Backend**: No changes
- **Shared types**: Reuse `Track`; snapshot types local to frontend (documented in contract YAML)

**Storage**: `localStorage` key `dexaudio.playback.session` (versioned JSON snapshot); no IndexedDB for session data

**Testing**: Vitest — unit tests for `playback-session.ts` serialize/restore/validation; extend `playback-queue-store.test.ts` for hydrate; mock `PlayerProvider` restore gate

**Target Platform**: PWA frontend (offline-capable); 320 px–desktop

**Performance Goals**: Restore visible in UI within SC-004 (median &lt; 3 s for ≤50 tracks); persist debounced ≤300 ms after queue edits; position throttle 5 s

**Constraints**:
- Constitution V: no new npm packages (manual persist via existing Zustand + localStorage)
- FR-004: `PlayerProvider` must not call `loadTrack` with autoplay during restore phase
- FR-011: no audio blobs in snapshot
- FR-014: do not persist `skippedIndices`

**Scale/Scope**: ~6–8 frontend files; one new lib module; no API routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ N/A (no BE change) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ N/A |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — toast only (sonner existing) |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — persistence lib, not UI |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ Pass — no API change |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — no new interactive-only flows |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — localStorage works offline |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — no layout change |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ N/A |

**Post-design re-check**: All gates remain ✅.

## Project Structure

### Documentation (this feature)

```text
specs/010-queue-playback-cache/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── playback-session.yaml
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── lib/
│   ├── local-storage.ts           # MODIFY — StorageKeys.playbackSession
│   └── playback-session.ts          # NEW — snapshot read/write/validate/clear
├── stores/
│   └── playback-queue-store.ts      # MODIFY — hydrate, playbackStarted, persist subscribe
├── contexts/
│   └── player-context.tsx         # MODIFY — restore phase; gate loadTrack
├── hooks/
│   └── use-player.ts              # MODIFY — autoplayOnLoad param; restored elapsed display
├── components/plex-auth/
│   └── PlexAuthModal.tsx            # MODIFY — clear session on wipe/sign-out
└── App.tsx                          # MODIFY — hydrate session on boot (if not in store init)

frontend/tests/unit/
├── playback-session.test.ts         # NEW
└── playback-queue-store.test.ts     # MODIFY — hydrate + queue-only cases
```

**Structure Decision**: Monorepo; all implementation in `frontend/`. Session I/O isolated in `playback-session.ts`; Zustand remains source of truth during runtime.

## Complexity Tracking

No constitution violations.

## Phase 0: Research

See [research.md](./research.md). Resolved: localStorage snapshot, restore phase gating `PlayerProvider`, debounced persist, library/auth clear triggers, queue-only `currentIndex: null`.

## Phase 1: Design

### Data model

See [data-model.md](./data-model.md) — `PlaybackSessionSnapshot`, validation, transitions.

### Contracts

See [contracts/playback-session.yaml](./contracts/playback-session.yaml) — client snapshot schema and invariants (no REST).

### Implementation sequence (for `/speckit-tasks`)

1. **`playback-session.ts`**: `loadSnapshot`, `saveSnapshot`, `clearPlaybackSession`, validation (schema, libraryId, max items), `RestoreOutcome` enum.
2. **`local-storage.ts`**: Add `StorageKeys.playbackSession`; optional `setActiveLibraryId(id)` wrapper that clears session when id changes.
3. **`playback-queue-store`**: `hydrateFromSnapshot`, `playbackStarted` flag, `subscribe` → debounced persist; queue-only sets `currentIndex` sentinel without marking playing.
4. **`use-player`**: Parameterize `loadTrack(..., { autoplayOnLoad })`; hold `restoredElapsedMs` for UI until play; seek on resume.
5. **`PlayerProvider`**: Run hydrate before effects; skip `loadTrack` effect while `restorePhase`; clear restore phase on user play.
6. **`PlexAuthModal`**: `clearPlaybackSession()` on `dataWiped` / disconnect paths.
7. **Tests**: Snapshot round-trip, library mismatch, corrupt JSON → outcome, queue-only null index, no autoplay gate (mock).
8. **Manual QA**: [quickstart.md](./quickstart.md).

### Agent context

`.cursor/rules/specify-rules.mdc` updated to reference this plan.
