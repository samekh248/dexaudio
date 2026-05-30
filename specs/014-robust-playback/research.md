# Phase 0 Research: Robust, Reliable Music Playback

This document resolves the open technical questions implied by the spec and Technical Context. Each decision records what was chosen, why, and what was rejected. All decisions respect Constitution V (no new dependencies).

## R1. Engine architecture — explicit state machine behind a testable adapter

**Decision**: Refactor `use-player.ts` so all lifecycle decisions flow through a pure, framework-free state machine (`playback-machine.ts`) operating over an `AudioEngine` adapter interface (`audio-engine.ts`) that wraps Howler. The hook becomes a thin binding of machine events → React state.

States: `idle → loading → ready → playing ⇄ paused`, plus `buffering` (transient, re-enters `playing`), `recovering` (retry in progress), `ended`, and `failed`. Events: `LOAD`, `LOADED`, `PLAY`, `PAUSE`, `STALL`, `RESUME`, `RETRY`, `ERROR`, `ENDED`, `SEEK`, `CANCEL`.

**Rationale**: The current code encodes state implicitly across ~10 refs (`loadIdRef`, `stagedGenRef`, `retryOnceRef`, `positionAtErrorRef`, …) and repeats `if (howlRef.current !== howl) return` guards in every callback. This is the root cause of fragility (double-advance, silent staged failures, stale closures). A single explicit machine makes invalid transitions impossible and is directly unit-testable, satisfying FR-019/SC-010. The adapter seam lets tests drive the machine with a fake engine (no jsdom audio).

**Alternatives considered**:
- *Keep ref-based ad-hoc logic, just add listeners*: rejected — does not address the structural cause of unreliability and remains untestable.
- *Adopt XState*: rejected — violates Constitution V (new dependency) for a small machine we can express in plain TypeScript.
- *Full rewrite on Web Audio API*: rejected — large blast radius, loses Howler's HTML5 streaming benefits, and is unnecessary for the listener-observable goals.

## R2. Buffering / stall detection and automatic recovery

**Decision**: Detect stalls with a **position watchdog** (repurpose the existing 250 ms poll): if the engine reports `playing` but `currentTime` has not advanced for a threshold (~1.5 s) and the element is not paused/ended, transition to `buffering`. Where available, also subscribe to the underlying HTML media element's native `waiting`/`stalled`/`playing`/`progress` events via the adapter for faster signal. While `buffering`, keep a recovery timer; if playback resumes, return to `playing`; if no progress within the **~10 s stall window** (FR-003), escalate to the retry path (R3).

**Rationale**: Howler (HTML5 mode) does not surface buffering as a first-class event, but the underlying `<audio>` element does, and a watchdog is a robust, library-agnostic backstop that also covers cached-blob edge cases. Combining both gives fast recovery without false positives. Position polling already exists, so cost is near-zero.

**Alternatives considered**:
- *Native events only*: rejected — `stalled`/`waiting` fire inconsistently across browsers and not at all for some blob sources.
- *Watchdog only*: acceptable fallback, but slower to react than native `waiting`; we use both.

## R3. Retry and backoff policy

**Decision**: Centralize in `recovery-policy.ts`: **max 3 retries** with exponential-ish backoff (~0.5 s, 1 s, 2 s) and a **~10 s stall window**, preserving the current position so retries resume in place. Only *recoverable* categories (network/stall) are retried; *terminal* categories (unsupported format, track not found, auth expired) skip retries and go straight to final handling. Each retry that has a cached/live alternative tries the alternate source first (R5).

**Rationale**: Matches the clarified "balanced" policy. Centralizing replaces today's single-shot `retryOnceRef` + ad-hoc cache→live reload with one auditable policy used by both initial load and mid-playback stalls. Distinguishing recoverable vs terminal avoids pointlessly retrying a 404/415.

**Alternatives considered**:
- *Aggressive (5 retries / 30 s)*: rejected per clarification — risks a player that appears hung.
- *Conservative (1 retry / 5 s)*: rejected per clarification — too eager to fail on normal transient blips.

## R4. Final-failure behavior and orchestration ownership (no double-advance)

**Decision**: Make `player-context.tsx` the **single orchestration owner**. The engine emits exactly one terminal signal per track — either `ENDED` (natural end) or `FAILED` (final, after recovery exhausted). The orchestrator maps both to a single `advanceQueue()` that moves exactly one position, and on `FAILED` it shows a brief non-blocking `aria-live` notice (auto-advance; stop only at queue exhaustion per FR-005/FR-015). Remove the auto-skip-on-error effect from `NowPlayingPage.tsx` so there is one and only one advance path.

**Rationale**: Today `onTrackEnd` calls `tryHandoffForward()` *then always* `advanceQueue()`, and `NowPlayingPage` independently auto-skips on error — two competing advance paths that can double-advance or fight (FR-006/FR-007/SC-004). A single owner with idempotent, generation-guarded advance removes the race. Gapless handoff becomes "promote staged audio, then reconcile the queue index to the now-active track" rather than two independent steps.

**Alternatives considered**:
- *Keep advance logic in both context and page*: rejected — this duplication is a known double-advance source.
- *Advance from inside the engine*: rejected — couples the audio engine to queue semantics and harms testability.

## R5. Source selection, fallback, and silent-failure elimination

**Decision**: Keep the dual cached-blob / live-stream strategy but model it as an ordered **candidate source list** per track with a defined fallback order (cached → live), owned by the engine. Apply the same recovery policy to staged (gapless/crossfade) preloads but **surface a degraded-transition signal** instead of failing silently: if a staged source can't be readied, the transition degrades to a normal load (an audible but explained behavior) rather than `suppressErrors` swallowing the problem (FR-017).

**Rationale**: The current `suppressErrors: true` on staged Howls converts staging failures into unexplained gaps. Treating sources as an explicit fallback list with a single recovery policy unifies the `useLiveOnCacheError` special case and the cache-miss path, shrinking edge-case surface.

**Alternatives considered**:
- *Always full-download before play*: rejected — hurts start latency (SC-001) and bandwidth.
- *Live-only (drop cache)*: rejected — breaks offline-first PWA (Constitution IV).

## R6. True overlapping crossfade (no new dependencies)

**Decision**: Implement crossfade by overlapping two engine instances: near track end (or on manual next), start the incoming track and ramp the outgoing volume `1→0` while ramping the incoming `0→1` over the configured `durationSec`, using Howler's built-in `fade()` / volume control. Reuse the existing staged-preload infrastructure to have the incoming track ready. Crossfade and gapless become mutually-exclusive transition *styles* selected by preference; `none` does an immediate cut.

**Rationale**: Satisfies the clarified requirement for a *true* overlapping crossfade applied consistently on natural ends and manual skips (FR-009). Howler already supports volume fades and we already stage a second instance for gapless, so no new dependency is needed (Constitution V). The fade must also fire on natural end, which today it does not.

**Alternatives considered**:
- *Web Audio API gain nodes*: rejected — more control but unnecessary complexity and risk vs. Howler fades for a simple linear crossfade.
- *Volume-fade-out then start next (current behavior)*: rejected — not a real crossfade; explicitly excluded by the clarification.

## R7. Reactive playback preferences

**Decision**: Move transition style (`none`/`gapless`/`crossfade`), crossfade `durationSec`, and gapless flag into a small Zustand store (`playback-prefs-store.ts`) backed by the existing `localStorage` keys, so the engine and controls read live values and re-render/re-bind on change. Settings UI writes through the store.

**Rationale**: `crossfade` is currently read once at hook init (`use-player.ts` line 138) and `isGaplessPlaybackEnabled()` is read imperatively at call sites; changing the setting needs a remount to take effect, violating FR-010/SC-008. Zustand is already the app's state tool (no new dependency) and gives reactive, persisted prefs consistent with the existing queue store.

**Alternatives considered**:
- *`storage` event listener on `localStorage`*: rejected — only fires cross-tab, not same-tab, so it wouldn't fix the in-app case.
- *Read prefs at every call site imperatively*: partially works for logic but doesn't trigger re-binding of effects/timers; the store is cleaner.

## R8. End-to-end byte-range support in the stream proxy

**Decision**: Extend `backend/src/api/routes/stream.ts` to forward the client's `Range` header to the upstream Plex stream/transcode fetch and propagate the upstream `206 Partial Content` status with `Content-Range`, `Accept-Ranges: bytes`, and `Content-Length`. When no `Range` is present, behave as today (200 + full body). Preserve the existing transcode/direct fallback order and `no-store` caching.

**Rationale**: The route advertises `accept-ranges: bytes` but never honors Range, so the browser cannot perform efficient seeks on live streams, making late-position seeking unreliable (FR-012/SC-007). Forwarding Range is standard HTTP and keeps the contract RESTful and versioned (Constitution III). Direct-play sources from Plex support Range; for transcode sources that cannot, we pass through whatever the upstream returns (200) and the client falls back to cached/full-buffer seek behavior.

**Alternatives considered**:
- *Client-side full pre-buffer for seeking*: rejected as the primary mechanism — defeats progressive start latency; retained only as a fallback when upstream can't range.
- *Cache-only seeking*: rejected per clarification (seeking must be reliable on live streams too).

## R9. Background tab and session-restore robustness

**Decision**: Keep the existing restore gate (`restorePhase`) and session persistence, but ensure the watchdog and recovery timers are tolerant of background-tab timer throttling (use timestamp deltas, not tick counts, to measure the stall window) and re-validate position on `visibilitychange`. Restore continues to require a user Play gesture (autoplay policy) and then resumes at saved position on the first attempt (FR-016).

**Rationale**: Browsers throttle timers in background tabs; counting ticks would mis-measure the 10 s window. Measuring wall-clock deltas keeps recovery correct across backgrounding (FR-018) without new dependencies.

**Alternatives considered**:
- *Web Workers / Web Locks for timing*: rejected — overkill and adds complexity for a problem solved by delta-based timing.

## Summary of resolved unknowns

| Topic | Resolution |
|-------|------------|
| Start-time / seek / recovery targets | 2 s start, 1 s seek, ~10 s stall window, 3 retries (from spec + clarifications) |
| Buffering detection | Native media events + position watchdog (delta-timed) |
| Crossfade | True overlap via two Howler instances + fade (no new deps) |
| Pref reactivity | Zustand `playback-prefs-store` over existing localStorage keys |
| Double-advance | Single orchestration owner; one terminal signal per track |
| Live-stream seeking | Forward `Range` → `206` in stream proxy |
| Testability | `AudioEngine` adapter + pure `playback-machine` enable fake-engine unit tests |

No `NEEDS CLARIFICATION` items remain.
