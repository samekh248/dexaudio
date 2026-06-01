# Phase 0 Research: Lossless FLAC Playback

All technical unknowns from the plan's Technical Context are resolved below. No `NEEDS CLARIFICATION` remain.

## 1. Detecting browser lossless decode capability

**Decision**: Use a synchronous `HTMLAudioElement.prototype.canPlayType()` probe, evaluated once and memoized per session:
- FLAC: `canPlayType("audio/flac")` or `canPlayType("audio/x-flac")` returns a non-empty string (`"probably"`/`"maybe"`).
- ALAC: `canPlayType('audio/mp4; codecs="alac"')` (ALAC is carried in an MP4/M4A container).

Expose `canPlayLossless(format: TrackFormat): boolean` in a new `frontend/src/lib/audio-capability.ts`.

**Rationale**: `canPlayType` is deterministic, synchronous, and cheap, so there is no need to "learn" capability across attempts or persist it (satisfies FR-009 — never attempt lossless on an incapable environment). Chrome/Edge/Firefox report FLAC support; Safari 16+ reports FLAC and ALAC. Probing avoids brittle user-agent sniffing.

**Alternatives considered**:
- User-agent sniffing — fragile, breaks on new browser versions. Rejected.
- `MediaSource.isTypeSupported` — concerns MSE, not the progressive HTML5 `<audio>` path Howler uses in `html5: true` mode. Rejected.
- Attempt-and-observe only (no pre-check) — wastes bandwidth fetching a large FLAC on a browser that cannot decode it, hurting SC-004/SC-007. Rejected as the primary gate, though attempt-time errors remain a secondary safety net.

## 2. Howler format hints for lossless playback

**Decision**: Extend `howlerFormatsForTrack` to accept the intended quality. When attempting lossless:
- FLAC → `["flac"]`
- ALAC → `["m4a", "mp4", "aac"]`

When transcoded (or preference off), keep today's `["mp3", "mpeg"]` for these formats.

**Rationale**: The stream URL has no file extension, so Howler relies on the `format` hint to choose a decoder. The transcoded stream is MP3; the lossless stream is the original container. The hint must match what the backend actually serves for the chosen mode.

**Alternatives considered**: Always passing every hint — Howler picks the first; ambiguous hints can mis-route decoding. Rejected in favor of mode-specific hints.

## 3. Expressing lossless intent over the existing REST endpoint

**Decision**: Add an optional query parameter to the existing endpoint: `GET /api/v1/stream/:trackId?quality=lossless` (allowed values `auto` (default/absent) and `lossless`). When `quality=lossless` and the track format is a lossless candidate (FLAC/ALAC), the backend orders delivery as `[direct original file, transcode]` instead of today's `[transcode, direct]`. The response sets `X-Dexaudio-Audio-Quality: lossless | transcoded` reflecting what was actually served.

**Rationale**: Reuses the versioned REST endpoint (Constitution III) with a backward-compatible parameter; absent param preserves current behavior exactly (FR-005, SC-002). The response header lets the client show an accurate indicator even when the backend had to fall back internally. `getStreamUrl` already returns the original file, so no new upstream integration is required.

**Alternatives considered**:
- A separate `/api/v1/stream/:trackId/lossless` route — duplicates proxy/range logic. Rejected (DRY).
- Inferring lossless server-side from the preference — the backend is stateless about client UI prefs and cannot know browser capability. Client must drive intent. Rejected.

## 4. Integrating downgrade into the existing recovery state machine

**Decision**: Track a per-load **quality mode** (`"lossless" | "transcoded"`) plus a `losslessFallbackRef` flag, mirroring the existing `useLiveFallbackRef` pattern in `use-player.ts`. Triggers reuse existing detection:
- **Load/decode error** on a lossless attempt (`onError`, recoverable) → set fallback flag and reload the track forcing transcoded mode, passing `initialSeekMs` = last progress position.
- **Stall window exceeded** while lossless (existing `stallWindowExceeded` / `RECOVERY_POLICY.stallWindowMs = 10s`) → same downgrade-and-resume.
- **Incapable browser** → never request lossless (Section 1), so no attempt to recover from.

The downgrade consumes a normal recovery attempt and resumes at position via the existing `initialSeekMs` load path (which already seeks once `loaded`). Because the lossless decision is recomputed on each fresh `loadTrack`, the next track re-attempts lossless (FR-008). A track that has already downgraded will not loop back to lossless within the same playback (FR — "Repeated fallback" edge case) because `losslessFallbackRef` stays set until the next track load.

**Rationale**: The robust-playback machine (spec 014) already centralizes stall/error/retry handling with backoff and load-generation guards. Layering a "downgrade quality" decision onto the existing retry path avoids a parallel recovery system and keeps regressions low (FR-014). Resuming at position satisfies the Q2 clarification.

**Alternatives considered**:
- A separate bandwidth meter / pre-flight speed test — explicitly rejected by clarification Q3; adds complexity and unreliable thresholds. Rejected.
- Restarting the track on downgrade — rejected by clarification Q2 (resume at position).

## 5. Cache and pinned-download quality

**Decision**: `fetchTrackAudioBlob` gains a `{ lossless }` option that appends `?quality=lossless`. Pre-cache (`pre-cache-worker.ts`) and pin (`pin-service.ts`) request lossless for FLAC/ALAC when the preference is enabled, regardless of the *current* browser's decode capability (a pinned track may later be played on a capable browser). The blob MIME for FLAC is already `audio/flac`; add `audio/mp4` for ALAC. Existing cache-capacity prompts govern the larger footprint (FR-015).

On playback of a cached lossless blob in an incapable browser, Howler raises a decode error; the existing cached→live fallback (`useLiveOnCacheError`) combined with the new transcoded downgrade serves a working stream. Cached blobs are played as stored; toggling the preference does not retroactively re-fetch existing cache entries (Assumption: "Cached audio respects stored quality").

**Rationale**: Storing lossless makes offline/pinned playback genuinely lossless, matching clarification Q5 and the offline-first principle, while the playback-time fallback keeps incapable environments working.

**Alternatives considered**:
- Always caching transcoded to save space (Q5 Option B) — rejected by clarification.
- A separate cache-quality setting (Q5 Option C) — rejected by clarification (avoid extra knob in v1).

## 6. Default-on rollout implications

**Decision**: Preference defaults to enabled (Q4). Because lossless is attempted for every capable browser by default, the capability pre-check (Section 1) and the downgrade path (Section 4) are load-bearing, not edge cases. Treat US2 (fallback) as P1 alongside US1.

**Rationale**: Default-on maximizes fidelity for the common case (modern browsers all decode FLAC) while the pre-check prevents wasted lossless fetches on incapable environments and the downgrade protects constrained connections.
