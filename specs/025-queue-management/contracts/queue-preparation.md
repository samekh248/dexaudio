# Contract: Queue Preparation Depth & Buffer UI

Client-only preference and runtime bridge between `use-player`, `playback-orchestrator`, and `QueuePanel`.

## Storage

- **Key**: `dexaudio.playback.queuePrepDepth` (`StorageKeys.queuePrepDepth`)
- **Shape**: `{ "depth": number }`
- **Default**: `{ "depth": 3 }`
- **Constraints**: integer `1..5` (clamp on read/write)

## Store API (`playback-prefs-store.ts`)

```ts
interface PlaybackPrefsStore {
  // existing fields…
  queuePrepDepth: number;
  setQueuePrepDepth(depth: number): void;
}

export function getQueuePrepDepth(): number;
```

| Given | When | Then |
|-------|------|------|
| No stored value | Read | `3` |
| User sets `1` | Next prep cycle | Only `currentIndex+1` staged |
| User sets `5` | Playing | Up to five forward tracks may stage |
| Mid-playback change | Index stable | New depth applies on next orchestrator tick |

## Prep status store (`queue-prep-store.ts`)

```ts
type PrepStatus = "idle" | "loading" | "ready" | "error";

interface TrackPrepState {
  status: PrepStatus;
  progressRatio: number | null; // 0..1, null when idle
}

// Zustand store
export function setTrackPrep(trackId: string, state: TrackPrepState): void;
export function clearTrackPrep(trackId: string): void;
export function clearAllExcept(trackIds: string[]): void;
export function useTrackPrep(trackId: string): TrackPrepState;
```

## Orchestrator extension (`playback-orchestrator.ts`)

```ts
function preloadForwardDepth(state: PlaybackQueueState): void;
```

| Given | Then |
|-------|------|
| `!playbackStarted` or `restorePhase` | No preload |
| `depth = N` | Call `bridge.preloadForward(track)` for each of `items[current+1 .. current+N]` |
| Track is `flac`/`alac` within 3 positions | Preload on index/items change immediately (lossless lead) |
| Track is compressed | Preload at `NEAR_END_PRELOAD_RATIO` (existing) plus index change for window |
| Transition `none` | Still preload forward pool (load-only staging) |
| Transition `gapless`/`crossfade` | Preload + existing handoff |

## Player bridge (`use-player.ts`)

- `preloadForward(track)` → upsert into `forwardByTrackId` map; wire `onProgress` / `onLoaded` to `queue-prep-store`.
- `cancelStagedOutside(trackIds: string[])` → dispose engines not in keep list.
- `getStagedForward(trackId)` → optional, for tests.

## Queue row buffer UI

- Render when `index === currentIndex + 1` (always) OR any upcoming index with `status === loading|ready` in prep store.
- Thin bar: `h-0.5`, `role="progressbar"`, `aria-valuenow={ratio*100}`, `aria-valuemin={0}`, `aria-valuemax={100}`.
- `error` → muted failed state (no blocking overlay).

## Performance targets (from spec)

- Desktop broadband: audible next track ≤500 ms after previous ends (no skip).
- Mobile profile: ≤1.5 s.
- Prep indicator `ready` before handoff in ≥90% of transitions (QA sampling).
