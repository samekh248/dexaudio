# Research: Queue and Now Playing Persistence

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## 1. Persistence storage

**Decision**: Single JSON document in `localStorage` via existing `getItem` / `setItem` / `removeItem` in `frontend/src/lib/local-storage.ts`, keyed `dexaudio.playback.session`.

**Rationale**: Matches volume, gapless, and library preference patterns (feature 004/005). No new dependencies; works offline; sufficient for ≤50-track queues per SC-004. IndexedDB reserved for audio blobs (FR-011).

**Alternatives considered**:
- *Zustand `persist` middleware*: Rejected — adds coupling and must serialize `Set` for skipped indices we intentionally drop anyway.
- *sessionStorage*: Rejected — lost on browser restart; spec requires survive tab close/reopen.
- *Backend session API*: Rejected — out of scope per spec Assumptions.

## 2. Snapshot shape and versioning

**Decision**: Versioned `PlaybackSessionSnapshot` (see [data-model.md](./data-model.md)): `schemaVersion`, `libraryId`, `items[]` (track + `source`), optional `currentIndex` (`null` = queue-only, never played), optional `elapsedMs`, `savedAt`. Max length guard: reject restore if `items.length > 200` or JSON parse fails.

**Rationale**: Enables corrupt-cache detection (FR-015), library mismatch clear (FR-012), and queue-only restore (clarification Q2).

**Alternatives considered**:
- *Persist only track IDs*: Rejected — requires N API round-trips on cold load; slower than SC-004 target.
- *Persist skipped indices*: Rejected — clarification session B.

## 3. Restore without auto-play

**Decision**: Introduce a **session restore phase** in `PlayerProvider`:
1. On app init, `hydratePlaybackSession()` loads snapshot into Zustand if `libraryId` matches `StorageKeys.activeLibraryId`.
2. Set player flag `restorePhase: true` (or equivalent) so the `useEffect` that calls `loadTrack(..., autoplayOnLoad: true)` is **skipped** while restore phase is active.
3. Expose restored `elapsedMs` in player UI state without starting Howler playback.
4. On first explicit `play()` from user, exit restore phase, call `loadTrack` with `autoplayOnLoad: true` and `seek(elapsedMs)`.

Extend `loadTrack` / `createHowl` to accept `autoplayOnLoad` parameter (today hardcoded `true` in `loadTrack`).

**Rationale**: `PlayerProvider` currently loads and autoplays whenever `current` exists (lines 42–46). Without a restore gate, FR-004 and SC-003 would fail on every reload.

**Alternatives considered**:
- *Load with `autoplayOnLoad: false` on restore*: Partial fix — still fetches/decodes audio on every reload; acceptable fallback but heavier than deferring load.
- *Separate “display only” track ref*: Rejected — duplicates queue current index.

## 4. When to persist

**Decision**:
- **Queue mutations**: Subscribe to `usePlaybackQueue` (Zustand `subscribe`) and persist after any state change to `items`, `currentIndex` (debounced 300 ms).
- **Position**: Throttle-save `elapsedMs` every 5 s during playback and on `pause` / `beforeunload` via `visibilitychange` + `pagehide`.
- **Playback started flag**: Set `hasActivePlayback: true` on first successful `play` or `loadTrack` with autoplay; clear when queue empty.

**Rationale**: FR-005 without blocking UI thread; avoids writing on every 250 ms progress tick.

**Alternatives considered**:
- *Persist only on `beforeunload`*: Rejected — mobile PWA may kill tab without event; loses queue edits.

## 5. Session clear triggers

**Decision**: Call `clearPlaybackSession()` when:
- Plex auth completes with `dataWiped` or explicit disconnect (`clearAllClientData` path in `PlexAuthModal`).
- `activeLibraryId` changes to a different non-empty value (compare previous vs new in wrapper around `setItem` or dedicated setter).
- Restore validation fails (schema, library mismatch) — clear storage and toast (FR-015).

**Rationale**: FR-009, FR-012, clarification Q1. Library today is set only in `PlexAuthModal`; wrapper future-proofs settings UI.

**Alternatives considered**:
- *Never clear on library change*: Rejected — violates clarification.

## 6. Queue-only session (no current track)

**Decision**: Persist `currentIndex: null` and omit `elapsedMs`. On restore, hydrate `items` only; Zustand `currentIndex` stays `0` but `hasActivePlayback: false` prevents treating index 0 as “now playing” in chrome until user selects/plays.

**Rationale**: Clarification Q2 — user must pick a track. UI uses `hasActivePlayback` (or `currentIndex === null` sentinel in store) for mini-player visibility.

**Alternatives considered**:
- *Use `currentIndex: -1`*: Viable; prefer explicit `playbackStarted` boolean in snapshot for clarity.

## 7. Corrupt cache UX

**Decision**: Use existing `sonner` toast: “Couldn’t restore your last playback session.” Then `clearPlaybackSession()` and in-memory empty queue.

**Rationale**: FR-015, clarification Q5; matches 004 toast patterns for non-blocking errors.

## 8. Multi-tab

**Decision**: Last write wins; no `storage` event sync in v1 (per spec Assumptions).

**Rationale**: Explicitly out of scope; documenting avoids scope creep.
