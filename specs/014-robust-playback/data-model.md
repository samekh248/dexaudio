# Phase 1 Data Model: Robust, Reliable Music Playback

This feature is primarily behavioral; the "data" is in-memory client playback state plus persisted session/preferences. Entities below map spec concepts to concrete shapes. Types live in `@dexaudio/shared-types` where shared with the backend, otherwise in the relevant frontend module.

## Entity: PlaybackEngineState (state machine)

The single source of truth for what the audio engine is doing. Replaces today's scattered refs.

**States**

| State | Meaning | Listener-visible |
|-------|---------|------------------|
| `idle` | No track loaded | Nothing playing |
| `loading` | Resolving source + buffering enough to start | Loading indicator |
| `ready` | Loaded, not yet started (e.g., restore gate) | Paused at position |
| `playing` | Audio advancing | Playing |
| `paused` | User-paused | Paused |
| `buffering` | Was playing, progress stalled, recovering in place | Brief buffering indicator |
| `recovering` | Retry attempt in flight (reload/alternate source) | Buffering indicator |
| `ended` | Reached natural end | Triggers advance |
| `failed` | Final failure after recovery exhausted | Brief notice + auto-advance |

**Fields**

- `status`: one of the states above
- `currentTrackId`: string | null
- `positionMs`: number (≥0)
- `durationMs`: number (≥0)
- `volume`: number (0–1)
- `fromCache`: boolean — whether the active source is the cached blob
- `transition`: TransitionStyle (the style that will apply to the next transition)
- `recovery`: { attempt: number (0–3); lastErrorAt: epoch ms | null; stallStartedAt: epoch ms | null }
- `failure`: PlaybackFailure | null

**Allowed transitions** (events from R1)

```
idle      --LOAD-->        loading
loading   --LOADED-->      ready
loading   --ERROR(recoverable)--> recovering
loading   --ERROR(terminal)-->    failed
ready     --PLAY-->        playing
playing   --PAUSE-->       paused
paused    --PLAY-->        playing
playing   --STALL-->       buffering
buffering --RESUME-->      playing
buffering --RETRY-->       recovering        (stall window exceeded)
recovering--LOADED-->      playing | ready
recovering--ERROR(retries left)--> recovering
recovering--ERROR(exhausted)-->    failed
playing   --ENDED-->       ended
any       --LOAD/CANCEL--> loading | idle    (supersedes via load generation)
any       --SEEK-->        (same state, positionMs updated)
```

**Invariants**

- Exactly one terminal event per track lifecycle reaches the orchestrator: `ended` XOR `failed` (supports FR-007/SC-004).
- A new `LOAD` increments a load generation; events from superseded loads are ignored (supports FR-008).
- `recovery.attempt` never exceeds 3; `stallStartedAt` window ≤ ~10 s before `RETRY`/`failed` (FR-003/FR-004).

## Entity: PlaybackSession (persisted)

Existing concept (localStorage key `dexaudio.playback.session`), retained. Used for restore.

- `trackId`: string
- `queueSnapshot`: ordered track ids + current index
- `elapsedMs`: number
- `volume`: number
- `transition`: TransitionStyle
- `savedAt`: ISO timestamp

**Rules**: persisted on pause and every ~5 s while playing; cleared when active library changes; restore requires a user Play gesture before auto-loading (autoplay policy); resumes at `elapsedMs` on first play (FR-016).

## Entity: PlaybackQueue (existing, mostly unchanged)

Zustand `playback-queue-store`. Ordered `items` with `currentIndex`, `loadGeneration`, `playbackStarted`, `restorePhase`, `restoredElapsedMs`, `skippedIndices`.

- Adds clarity: `advance(delta)` moves exactly one position and is idempotent w.r.t. a given terminal signal (orchestrator-guarded).
- `failedIndices` (derived/added): tracks that reached `failed`, so queue-exhaustion detection (FR-015) can tell "all remaining failed" from "no more tracks".

## Entity: TrackSource (new, engine-internal)

A playable candidate origin for a track, with fallback order.

- `kind`: `"cache"` | `"live"`
- `url`: string (blob URL for cache, `/api/v1/stream/:id` for live)
- `mime` / `formatHints`: from `stream-audio` helpers
- `order`: number (cache=0, live=1)

**Rules**: engine tries sources in `order`; a recoverable failure on `cache` falls back to `live` before counting a global retry (R5); seeking relies on live source supporting Range (R8) or cache being complete.

## Entity: PlaybackFailure (existing, extended classification)

Existing shared type in `@dexaudio/shared-types` (see `playback-errors.ts`). Add a recoverability flag to drive the policy.

- `category`: `server_unreachable` | `auth_expired` | `network_interrupted` | `autoplay_blocked` | `track_not_found` | `unsupported_format` | `unknown`
- `recoverable`: boolean — `true` for `network_interrupted`/`server_unreachable`/stall; `false` for `track_not_found`/`unsupported_format`/`auth_expired`
- `message`, `affordances`, `timestamp`, `trackId`, `trackTitle`, `trackArtist`, `technicalDetail` (existing)

**Rules**: only `recoverable` failures enter the retry/backoff path; terminal failures go straight to final handling (auto-advance with notice).

## Entity: Transition (preference + behavior)

- `TransitionStyle`: `"none"` | `"gapless"` | `"crossfade"`
- `crossfadeDurationSec`: number (default 3; clamped to remaining track time)
- Persisted via `playback-prefs-store` over existing localStorage keys (`dexaudio.playback.crossfade`, `dexaudio.playback.gapless`).

**Rules**: `gapless` and `crossfade` are mutually exclusive styles; the active style applies identically to natural ends and manual skips (FR-009); changing the style takes effect on the next transition without reload (FR-010/SC-008).

## Entity: RecoveryPolicy (new constants)

Centralized in `recovery-policy.ts`.

- `maxRetries`: 3
- `backoffMs`: [500, 1000, 2000]
- `stallWindowMs`: ~10000
- `stallDetectMs`: ~1500 (no-progress threshold to enter `buffering`)

**Rules**: timing measured by wall-clock deltas (background-tab safe, R9).

## State ↔ requirement traceability

| Requirement | Modeled by |
|-------------|-----------|
| FR-001/002 | `loading → ready → playing` happy path; start-time target |
| FR-003 | `buffering` state + `stallWindowMs` |
| FR-004 | `recovering` + RecoveryPolicy (`maxRetries`, `backoffMs`) |
| FR-005/015 | `failed` terminal + orchestrator auto-advance / exhaustion via `failedIndices` |
| FR-006/007 | single terminal event + generation-guarded `advance` |
| FR-008 | load generation supersession |
| FR-009/010 | Transition entity + reactive prefs store |
| FR-012 | TrackSource + Range support (backend) |
| FR-014 | TrackSource fallback order |
| FR-016 | PlaybackSession restore rules |
| FR-017 | staged preload surfaces degraded-transition signal, not silent error |
| FR-018 | delta-timed recovery + `visibilitychange` revalidation |
