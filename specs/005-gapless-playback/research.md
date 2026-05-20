# Research: Gapless Playback

## R-001: Howler.js Gapless Transition Pattern

**Decision**: Use a **staged second `Howl` instance** for the immediate forward neighbor while the current track plays; on `onend` or gapless Next, start the staged instance immediately, then tear down the outgoing instance in the background.

**Rationale**: The current `loadTrack` path calls `unload()` before fetching/creating the next `Howl`, which necessarily introduces dead air. Howler.js has no built-in cross-file gapless API. The standard web-player pattern is to decode the next file while the current one plays, then swap instances at the boundary with no intervening `unload()` on the active output.

**Implementation approach**:

1. Add `preloadTrack(track)` in `use-player.ts` that creates `nextHowlRef` (blob URL + `Howl` with `autoplay: false` or `play()` suppressed until handoff).
2. On `onend` when gapless is enabled and `nextHowlRef` matches the queued next track, call `nextHowlRef.play()` within the same tick, promote it to `howlRef`, revoke/unload the old instance asynchronously.
3. If staged instance is missing or not `state() === 'loaded'`, fall back to existing `loadTrack` (silent degrade per spec).
4. Manual **Next** uses the same staged instance when the target is `currentIndex + 1`; otherwise call `loadTrack` directly.
5. Manual **Previous** uses a staged `prevHowlRef` when gapless is on and the target matches priority slot (2) or (4) preparation.

**Alternatives considered**:

- **Pre-cache blobs only (no staged Howl)**: Rejected alone — even cached blobs still pay `unload()` + `new Howl()` + decode latency; unlikely to meet SC-002 (&lt;50 ms median) reliably.
- **Web Audio API `AudioBufferSourceNode` scheduling**: Rejected — would replace Howler for transitions, violates YAGNI and rewrites the audio engine.
- **Single Howl with concatenated sprite**: Rejected — queue items are independent files from Plex; concatenation is not practical.

---

## R-002: Bidirectional Pre-Cache Priority Queue

**Decision**: Replace forward-only `preCacheUpcoming` with `preCacheGaplessNeighbors(tracks, currentIndex)` that enqueues four slots in strict priority order, processing **one fetch at a time** (serial) to avoid bandwidth contention.

**Rationale**: Clarifications require priority: (1) next, (2) previous, (3) second-ahead, (4) two-behind. The existing worker loops `slice(currentIndex + 1, currentIndex + 1 + lookAhead)` in parallel `for` without priority or backward indices.

**Implementation approach**:

1. Build ordered slot list `[(+1), (-1), (+2), (-2)]` filtered to valid queue indices.
2. For each slot in order, if not already cached, `await fetch` + `writeToCache` before moving to lower priority (respects FR-004a ordering under bandwidth limits).
3. Effective forward look-ahead = `max(userSetting, 2)` when gapless enabled; when disabled, keep existing forward-only `preCacheUpcoming` behavior unchanged.
4. Pass **protected track IDs** (the four slot keys) into eviction so `selectEvictionCandidates` / `writeToCache` prefer evicting entries outside that window (FR-004c).

**Alternatives considered**:

- **Parallel fetch of all four slots**: Rejected — competes with active stream bandwidth and inverts priority under load.
- **Separate IndexedDB store for gapless**: Rejected — spec requires one coordinated pre-cache policy.

---

## R-003: Gapless-Aware Cache Eviction

**Decision**: Extend `selectEvictionCandidates` (or a wrapper) to accept `protectedKeys: Set<string>` and evict LRU pre-cache entries **not** in the protected set first; only evict protected entries if still over cap after exhausting outsiders.

**Rationale**: FR-004c allows evicting entries outside the four-slot window to make room for priority slots. Current LRU evicts purely by `last_accessed_at` across all pre-cache entries with no concept of gapless neighbors.

**Implementation approach**:

1. Before `writeToCache` for a gapless slot, call `ensurePreCacheSpace(neededBytes, protectedKeys)`.
2. Sort eviction candidates: non-protected LRU first, then protected LRU.
3. Never pass `pinned: true` permanent entries into eviction (already excluded by `cache_kind` filter).

---

## R-004: Crossfade vs Gapless Mutual Exclusion

**Decision**: Centralize mutual exclusion in `PlaybackSettingsSection` toggles and mirror state in `localStorage`; show Sonner toast when one disables the other.

**Rationale**: FR-011 requires enabling gapless disables crossfade and vice versa with a short notice. Today crossfade and pre-cache are independent switches with no interaction.

**Implementation approach**:

1. Add `StorageKeys.gaplessPlayback` (default `false`).
2. On gapless enable: set `crossfade.enabled = false`, persist, toast "Crossfade turned off — cannot run with gapless playback."
3. On crossfade enable: set `gaplessPlayback = false`, persist, toast reciprocal message.
4. `use-player.ts` reads gapless flag: when true, `fadeOut` becomes immediate `cb()` (same as crossfade off today).
5. `NowPlayingPage` natural `onend` handler: use gapless handoff instead of `loadTrack` when staged instance ready.

---

## R-005: Backend / API Surface

**Decision**: **No backend or REST contract changes** for this feature.

**Rationale**: Gapless is entirely client-side: pre-cache in IndexedDB, Howler staging, and Settings persistence. Stream endpoint behavior from feature 004 is sufficient.

**Alternatives considered**:

- **Server-side "prepare next stream" endpoint**: Rejected — adds latency round-trip without benefit over existing `/api/v1/stream/:trackId` + client cache.

---

## R-006: Observability (Deferred Detail)

**Decision**: Log gapless handoff outcomes at `debug` level only (staged hit, staged miss, degrade) via existing diagnostics pattern; no user-visible metrics UI.

**Rationale**: Spec requires silent degrade; operators can diagnose via console/debug channel in development. Full metrics dashboard is out of scope (deferred from clarify).
