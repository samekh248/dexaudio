# Research: Queue Management

**Feature**: `025-queue-management` | **Date**: 2026-06-03

## 1. Played vs upcoming segmentation (display-only trim)

**Decision**: Derive UI sections from `currentIndex` and `playbackStarted` only. Indices `0 .. currentIndex-1` are logically "passed"; the played **panel** renders `items.slice(max(0, currentIndex - 3), currentIndex)`. Indices `currentIndex .. end` are active/upcoming (current row pinned in upcoming section per spec).

**Rationale**: Clarifications require display-only trim (full queue order unchanged). Pure functions in `queue-display.ts` keep `QueuePanel` dumb and testable.

**Alternatives considered**:
- Persist a separate `playedIndices` set — rejected; re-anchor is index-based and would duplicate state.
- Remove old tracks from `items[]` — rejected; violates spec and breaks persistence ordering.

## 2. Re-anchor on backward selection

**Decision**: Reuse `setIndex(targetIndex)` (bumps `loadGeneration`, sets `playbackStarted`). UI regroups by new `currentIndex`; tracks after the target become upcoming even if previously "passed."

**Rationale**: Store already supports arbitrary index jumps; no new store fields.

**Alternatives considered**:
- Truncate `items` on jump back — rejected (spec: display-only trim).

## 3. Drag-and-drop reorder (no new library)

**Decision**: Implement reorder with **native HTML5 drag-and-drop** (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) on upcoming rows only (`index > currentIndex`). Add **keyboard** "move up/down" on focused upcoming row for WCAG 2.1 AA.

**Rationale**: Constitution V forbids adding `@dnd-kit` without explicit user request. No existing DnD in repo; native API is sufficient for vertical list reorder.

**Alternatives considered**:
- `@dnd-kit/sortable` — better UX but new dependency; document for future if user requests.
- Pointer-only custom drag — higher effort, same a11y gap without keyboard path.

## 4. Reorder constraints in store

**Decision**: Add `reorderUpcoming(from, to, currentIndex)` (or validate in caller) so `from` and `to` are both `> currentIndex` and `from !== to`. Keep `currentIndex` unchanged when reordering strictly after current.

**Rationale**: Spec pins current row; existing `reorder(from, to)` is unconstrained and could move current.

## 5. Preparation depth & staged pool

**Decision**: Extend `playback-prefs-store` with `queuePrepDepth: number` (min 1, max 5, default 3) persisted at `StorageKeys.queuePrepDepth`. Replace single `stagedForwardRef` with a **Map keyed by `track.id`** (max size = depth), disposing entries outside the window. Orchestrator calls `preloadForward` for each track in `[currentIndex+1 .. currentIndex+depth]` on index/items change and near-end progress.

**Rationale**: Today only one forward staged slot exists (`use-player.ts`); spec requires three-deep default with user setting. Map allows per-row buffer UI (FR-008–010).

**Alternatives considered**:
- Array of N refs — equivalent; map simplifies lookup by track id for UI.

## 6. Preload when transition is `none`

**Decision**: Run forward staging whenever `queuePrepDepth >= 1` and playback is active, **not only** for gapless/crossfade. Gapless/crossfade still use `promoteStaged` / `tryHandoffForward`; `none` uses staged engines only to reduce load latency (no overlap).

**Rationale**: FR-011/012 require preparing the next track before end; current orchestrator skips preload when transition is `none` (`preloadNeighbors` early return).

**Alternatives considered**:
- Rely on `pre-cache-worker` only — insufficient for audible handoff SC-003; does not expose row-level buffer %.

## 7. Lossless earlier preparation

**Decision**: When next+1..+3 tracks include `flac`/`alac`, call `preloadForward` immediately on queue/index change (not only at 75% progress). Compressed successors still follow existing `NEAR_END_PRELOAD_RATIO` (0.75) and `prefetchNextCachedTrack` paths.

**Rationale**: FR-013 and spec acceptance scenario 2; lossless startup dominates gap budget.

**Alternatives considered**:
- Fixed +30 s wall-clock lead — harder to test; index-based rule is deterministic.

## 8. Buffer progress indicator in queue rows

**Decision**: During staged preload, wire `AudioEngineEvents.onProgress` and Howler `onload` / `load` state to update `queue-prep-store` per `trackId`: `idle | loading | ready | error` plus optional `progressRatio` (0–1). UI: thin `role="progressbar"` bar at bottom of row (Tailwind `h-0.5`).

**Rationale**: Staged engines already call `engine.load`; progress was stubbed (`onProgress: () => {}`). Surfacing load state satisfies FR-008 without new network APIs.

**Alternatives considered**:
- Indeterminate spinner only — fails SC-005 measurable "reaches completed state."
- Byte-level HTTP progress — not exposed uniformly for Howler/blob URLs; engine state is the stable seam.

## 9. Prep retarget on reorder/skip

**Decision**: On `items` or `currentIndex` change, cancel staged entries not in the new depth window (`cancelStagedPreloads` scoped by track id), clear stale `queue-prep-store` entries within 1 s (FR-014).

**Rationale**: Prevents wrong-row buffer bars after fast reorder.

## 10. Settings UI for preparation depth

**Decision**: Add control to `PlaybackSettingsSection` — `Select` or `Slider` (1–5), label "Queue preload depth", helper text explaining default 3.

**Rationale**: FR-016; matches existing playback prefs location and `localStorage` pattern.

**Alternatives considered**:
- Dedicated queue settings page — over-scoped for one numeric pref.
