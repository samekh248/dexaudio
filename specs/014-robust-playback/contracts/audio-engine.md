# Contract: AudioEngine Adapter & Player Surface

Internal (frontend) contracts. The `AudioEngine` adapter is the testable seam wrapping Howler; the player surface is the stable API consumed by existing UI. Defining these contracts lets the engine logic be unit-tested with a fake adapter (FR-019/SC-010) without changing component consumers.

## AudioEngine interface (`frontend/src/lib/audio-engine.ts`)

A thin abstraction over a single audio source. The production implementation wraps `Howl`; tests provide a `FakeAudioEngine`.

```ts
export interface AudioEngineEvents {
  onLoaded(durationMs: number): void;
  onPlay(): void;
  onPause(): void;
  onEnded(): void;
  onError(error: number | string): void;
  onStall(): void;       // native 'waiting'/'stalled' OR watchdog
  onResume(): void;      // progress observed after a stall
  onProgress(positionMs: number): void;
}

export interface AudioEngine {
  load(src: string, formatHints: string[], events: AudioEngineEvents): void;
  play(): void;
  pause(): void;
  stop(): void;
  seek(ms: number): void;
  getPositionMs(): number;
  getDurationMs(): number;
  setVolume(v: number): void;     // 0..1
  fadeVolume(from: number, to: number, ms: number): void; // for crossfade
  state(): "unloaded" | "loading" | "loaded";
  destroy(): void;                // unload + revoke blob URL
}
```

**Rules**
- Exactly one of `onEnded` / `onError(terminal)` is the lifecycle terminal per load.
- `load` supersedes any prior load on the same engine instance (callers also use a load generation).
- `fadeVolume` is implemented via Howler's native fade; the fake records calls for assertions.
- The adapter owns blob-URL lifetime (revoke on `destroy`).

## Player surface (`usePlayer()` from `player-context.tsx`)

Stable shape consumed by `AudioPlayer`, `NowPlayingPage`, `use-playback-controls`, etc. Existing fields are preserved; behavior is made reliable. (No breaking changes to consumers.)

```ts
type PlayerSurface = {
  // state (existing)
  playing: boolean;
  position: number;     // ms
  duration: number;     // ms
  volume: number;
  fromCache: boolean;
  loading: boolean;
  error: PlaybackFailure | null;
  autoplayBlocked: boolean;
  restorePhase: boolean;
  restoredElapsedMs: number;

  // status (new, additive — derived from PlaybackEngineState)
  status: "idle" | "loading" | "ready" | "playing" | "paused" | "buffering" | "recovering" | "ended" | "failed";

  // commands (existing signatures preserved)
  loadTrack(track: Track, onEnd?: () => void, options?: LoadTrackOptions): Promise<void>;
  play(): void;
  pause(): void;
  seek(ms: number): void;
  setVolume(v: number): void;
  clearError(): void;
  resumeAutoplay(): void;

  // transition helpers (existing names retained; semantics unified)
  preloadForward(track: Track, onEnd?: () => void): void;
  preloadBackward(track: Track, onEnd?: () => void): void;
  tryHandoffForward(expected?: Track): boolean;
  tryHandoffBackward(expected?: Track): boolean;
  getActiveTrackId(): string | null;
  cancelStagedPreloads(): void;
};
```

**Behavioral guarantees (new)**
- `loading`/`buffering`/`recovering` are reflected via `status` so UI can show an accurate indicator (FR-011).
- Transport commands are accepted in any state and resolve to a consistent final state once the engine is ready (FR-011, US3 scenario 1).
- A final failure sets `error`, surfaces a non-blocking notice, and the orchestrator auto-advances — consumers MUST NOT implement their own auto-skip (removes double-advance; FR-005/FR-007).

## Orchestration contract (`player-context.tsx`)

- Single owner of queue↔engine sync. On `current` track change (and not in `restorePhase`), loads via the engine; on terminal (`ended`/`failed`) advances exactly one position.
- Gapless/crossfade handoff: promote staged engine, then reconcile queue index to the now-active track in one guarded step (no separate `next()` that can double-advance).
- Exhaustion: if advance finds no further playable track (all remaining `failed` or none left), stop cleanly with messaging (FR-015).

## Test notes

- `playback-machine.test.ts`: pure transition table coverage incl. supersession, stall→recover, retry exhaustion.
- `use-player.engine.test.ts` / `.recovery.test.ts` / `.crossfade.test.ts`: drive the hook with `FakeAudioEngine`; assert state, retries/backoff, crossfade `fadeVolume` calls, no silent staged failures.
- `player-context.orchestration.test.tsx`: natural end and final failure each advance exactly once; rapid next settles on correct track.
