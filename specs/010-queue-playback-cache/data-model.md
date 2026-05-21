# Data Model: Queue and Now Playing Persistence

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

**None.** No PostgreSQL or backend API changes.

## Client Persistence Model

### `PlaybackSessionSnapshot` (localStorage JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `number` | yes | Current `1`; bump on breaking shape changes |
| `libraryId` | `string` | yes | Must match `StorageKeys.activeLibraryId` on restore |
| `items` | `PersistedQueueItem[]` | yes | Ordered queue; may be empty |
| `currentIndex` | `number \| null` | yes | Active track index; `null` if user never started playback |
| `elapsedMs` | `number` | no | Position in current track; present only when `currentIndex !== null` |
| `savedAt` | `string` (ISO 8601) | yes | Last persist timestamp |

### `PersistedQueueItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `track` | `Track` | yes | Full shared-types `Track` for UI + stream re-resolve |
| `source` | `"user" \| "auto"` | yes | Matches `QueueItem.source` in Zustand store |

**Not persisted**: `skippedIndices`, `loadGeneration`, Howl handles, blob URLs, audio cache keys.

### In-memory extensions (`playback-queue-store`)

| Field | Type | Description |
|-------|------|-------------|
| `playbackStarted` | `boolean` | `true` after user has started playback this session; drives FR-002/queue-only UI |
| `hydrated` | `boolean` | `true` after restore attempt completes (success or fallback) |

Optional: represent “no current track” as `currentIndex: -1` internally while `items.length > 0`; snapshot still uses `currentIndex: null`.

## Validation Rules

| Rule | Action on failure |
|------|-----------------|
| JSON parse error | Toast FR-015; clear key; empty queue |
| `schemaVersion` unsupported | Same as corrupt |
| `libraryId` ≠ active library | Clear key; empty queue (FR-012) |
| `items.length > 200` | Clear key; empty queue (guardrail) |
| `currentIndex` out of range | Clamp or clear session |
| `elapsedMs < 0` or > track `durationMs` | Clamp to `[0, durationMs]` |

## State Transitions

```text
[App load]
  → read snapshot
  → invalid / wrong library → clear + optional toast → empty queue, stopped
  → valid → hydrate items (+ currentIndex, elapsedMs, playbackStarted flag)
  → restorePhase in player → no loadTrack / no audio (FR-004)

[User presses play after restore]
  → exit restorePhase
  → loadTrack(current, autoplay true) + seek(elapsedMs)

[Queue mutation / position tick]
  → debounced persist snapshot

[Sign out / data wipe / library change]
  → clearPlaybackSession()

[Private browsing / quota exceeded]
  → persist no-op; session RAM-only for tab lifetime
```

## Storage Key

| Key | Value |
|-----|--------|
| `dexaudio.playback.session` | `PlaybackSessionSnapshot` JSON string |

Defined in `StorageKeys.playbackSession` (to be added in implementation).

## Integration Points

| Module | Role |
|--------|------|
| `playback-queue-store.ts` | Hydrate + subscribe persist |
| `playback-session.ts` (new) | serialize / deserialize / clear |
| `player-context.tsx` | Restore phase gate on `loadTrack` |
| `use-player.ts` | `autoplayOnLoad` param; seek after restore play |
| `PlexAuthModal.tsx` | Clear on auth wipe |
| `local-storage.ts` | Storage key + library change helper |
