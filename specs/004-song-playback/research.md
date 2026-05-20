# Research: Song Playback

## R-001: Plex Audio Transcoding API

**Decision**: Use Plex's built-in universal transcode endpoint for non-browser-native codecs.

**Rationale**: Plex provides a universal transcode endpoint at `/{transcodeType}/:/transcode/universal/start.{extension}` that handles server-side transcoding without any app-managed dependencies. For audio, `transcodeType` is `music`. The endpoint accepts `path` (the internal PMS path like `/library/metadata/{ratingKey}`), `protocol` (`http` for direct streaming), and `musicBitrate` (target bitrate in kbps). The server transcodes on-the-fly and returns a browser-decodable stream (e.g., MP3).

**Implementation approach**:

1. When the existing direct stream URL (`/library/metadata/{trackId}/file`) returns an error or serves a non-browser-decodable format (ALAC, WMA, etc.), the backend falls back to constructing a Plex transcode URL:
   ```
   GET {plexBaseUrl}/music/:/transcode/universal/start.mp3
     ?path=/library/metadata/{ratingKey}
     &protocol=http
     &musicBitrate=320
     &X-Plex-Token={token}
     &X-Plex-Client-Identifier=dexaudio
   ```
2. The backend proxies this transcoded stream to the frontend, same as the direct stream. The frontend has no knowledge of whether transcoding occurred.
3. Only if the transcode endpoint also fails (returns non-2xx) does the system surface an "unsupported format" error to the user.

**Alternatives considered**:
- **App-side ffmpeg**: Rejected — adds a heavy dependency, violates Constitution Principle V, and is unnecessary when Plex already handles transcoding.
- **Client-side Web Audio API decoding**: Rejected — browser codec support is limited and inconsistent; server-side transcoding is more reliable and uses the existing Plex infrastructure.

---

## R-002: Howler.js Error Handling

**Decision**: Register `onloaderror` and `onplayerror` callbacks on each `Howl` instance to detect playback failures and classify them.

**Rationale**: Howler.js fires error events with the following codes:
- **1**: Fetch aborted by user agent
- **2**: Network error during fetch
- **3**: Decode error (media resource unusable after establishing connection)
- **4**: Media resource not suitable (format/src issue)

The error parameter can be either a numeric code or a `MediaError` message string. Howler does not provide HTTP status codes directly, so the backend must propagate error details in the response body or via HTTP status codes that the frontend's `api-client.ts` can parse before Howler even attempts to load.

**Implementation approach**:

1. Pre-flight: Before creating a `Howl`, the frontend already fetches from `/api/v1/stream/{trackId}`. If the backend returns an error (4xx/5xx), the `ApiError` class already captures `status`, `code`, and `action`. This error is classified before Howler is involved.
2. Howler-level: Register `onloaderror(id, error)` and `onplayerror(id, error)` on each `Howl` instance:
   - Code 2 → network interruption
   - Code 3 → decode failure (unsupported format that passed the backend check)
   - Code 4 → source not suitable (bad URL, corrupted cache)
   - Code 1 → user-initiated abort (ignore, not an error)
3. Map these to the spec's error categories (unsupported format, server unreachable, auth expired, track not found, network interrupted, autoplay blocked, unknown).

**Alternatives considered**:
- **Wrapping Howler in try-catch**: Rejected — Howler errors are asynchronous callbacks, not thrown exceptions.
- **Polling Howl state**: Rejected — event-driven callbacks are more reliable and lower overhead than polling.

---

## R-003: Browser Autoplay Policy Detection

**Decision**: Detect autoplay blocks by catching the `play()` rejection and checking `Howler.ctx.state`, then surface a one-click "Play" affordance.

**Rationale**: Modern browsers (Chrome 71+, Safari, Firefox) block audio playback unless a user gesture has occurred. Howler.js with `html5: true` returns a promise from `play()` that rejects on autoplay block. Additionally, when using the Web Audio API backend, `Howler.ctx.state === 'suspended'` indicates the audio context is blocked. There is no single universal API, but the combination of promise rejection + context state check covers all major browsers.

**Implementation approach**:

1. In `usePlayer.loadTrack`, after creating the `Howl`, call `howl.play()`. If the play promise rejects (or `onplayerror` fires with the autoplay-specific error), check:
   - `Howler.ctx?.state === 'suspended'` (Web Audio API path)
   - The error message contains "play() request was interrupted" or "user didn't interact" patterns
2. If autoplay is blocked, set an `autoplayBlocked` state flag instead of treating it as a failure.
3. The UI renders a prominent "Play" button that, on click (a user gesture), calls `Howler.ctx.resume()` and then `howl.play()`.
4. Subsequent play actions within the same session won't be blocked because the user has already gestured.

**Alternatives considered**:
- **Muting audio then unmuting after gesture**: Rejected — doesn't solve the problem (muted autoplay is allowed but produces no audible output, which is the same as "not playing" from the user's perspective).
- **Proactive gesture capture on page load**: Rejected — cannot reliably capture gestures without explicit user intent; feels deceptive.
- **W3C Autoplay Policy Detection API**: Not yet widely supported (W3C Working Draft as of 2025); not reliable enough to depend on today.

---

## R-004: Rapid Play Cancellation

**Decision**: Track the current `Howl` instance via a ref and unload it before creating a new one, combined with an AbortController for in-flight fetch requests.

**Rationale**: When the user clicks play on multiple tracks rapidly, the existing `loadTrack` function already calls `unload()` which destroys the current `Howl`. However, there's a race condition: if a new `loadTrack` call arrives while the previous one's `fetch` or `Howl` constructor is still in progress, both could complete and produce overlapping audio.

**Implementation approach**:

1. Maintain a `loadIdRef` (incrementing counter) in `usePlayer`. Each `loadTrack` call increments the counter and captures its own ID.
2. At every async boundary (after `readFromCache`, after fetch, after `Howl` creation), check if `loadIdRef.current` still matches. If not, abort the stale operation.
3. Use an `AbortController` for the fetch to `/api/v1/stream/{trackId}` so the network request is actually cancelled, not just ignored.
4. The `unload()` call at the start of `loadTrack` destroys any existing `Howl`, stopping its audio immediately.

**Alternatives considered**:
- **Debouncing play actions**: Rejected — introduces perceptible delay on legitimate single-click play actions (violates the 2-second requirement).
- **Queue-based loading**: Over-engineering — the simple ref + counter pattern handles the race condition without additional state management.

---

## R-005: Volume Persistence

**Decision**: Store volume in `localStorage` and initialize `usePlayer` with the stored value.

**Rationale**: The spec requires volume to persist across track transitions within a session (FR-023). The existing `usePlayer` hook already accepts a volume state, but initializes it to `1` (max). Using `localStorage` is the simplest approach — it persists across page reloads within the same browser and requires no server-side storage.

**Implementation approach**:

1. On `usePlayer` initialization, read volume from `localStorage` (key: `dexaudio.volume`, default: `1`).
2. On every `setVolume` call, write the new value to `localStorage`.
3. When a new `Howl` is created in `loadTrack`, pass the current volume state to `new Howl({ volume })`.

**Alternatives considered**:
- **Server-side persistence**: Rejected — over-engineering for a single-user single-device app; `localStorage` is sufficient and has zero latency.
- **Zustand store**: Could work but adds unnecessary coupling; `localStorage` with the existing `getItem`/`setItem` pattern used elsewhere in the codebase is simpler.

---

## R-006: Track Format Detection

**Decision**: Expand `parseTrackFromMetadata` to detect AAC/M4A, OGG/Opus, WAV, ALAC, and WMA codecs from Plex metadata.

**Rationale**: The current implementation only recognizes `flac` and `mp3`, classifying everything else as `unsupported`. Per the spec (FR-020), browser-native formats (FLAC, MP3, AAC/M4A, OGG/Opus) should be played directly, while other formats (ALAC, WMA, WAV) should trigger the Plex transcoding fallback. The codec string from Plex metadata (`attrs.codec`) is the source of truth.

**Implementation approach**:

1. Extend `TrackFormat` enum in `packages/shared-types` to: `flac | mp3 | aac | ogg | wav | alac | wma | unsupported`.
2. In `parseTrackFromMetadata`, map Plex codec strings:
   - `aac`, `m4a` → `aac`
   - `ogg`, `opus`, `vorbis` → `ogg`
   - `wav`, `wave` → `wav`
   - `alac` → `alac`
   - `wma`, `wmav2` → `wma`
3. In the stream endpoint, classify formats as browser-native (`flac`, `mp3`, `aac`, `ogg`) vs. needs-transcode (`wav`, `alac`, `wma`, `unsupported`) and route accordingly.

**Alternatives considered**:
- **Content-type sniffing on the stream**: Less reliable — Plex may not always set correct content-type headers; the codec metadata from the library scan is more trustworthy.
- **Keeping only flac/mp3/unsupported**: Insufficient — would force transcoding for AAC and OGG which browsers can play natively, wasting server resources.

---

## R-007: Mid-Stream Error Recovery

**Decision**: Detect mid-stream failures via Howler's existing event system and fall back to a fresh stream attempt before surfacing an error.

**Rationale**: The spec requires that partial playback followed by network drop produces a visible message (edge case). Howler.js fires `onend` prematurely or `onloaderror` with code 2 (network error) when a stream is interrupted mid-playback.

**Implementation approach**:

1. Register an `onloaderror` handler that checks if `position > 0` (meaning playback had started). If so, classify as "network interrupted" rather than "track not found".
2. On network interruption, attempt one automatic retry: re-fetch the stream URL and create a new `Howl` seeking to the last known position. If the retry also fails, surface the error.
3. For cached tracks that fail mid-playback (corrupted cache), fall back to the live stream URL (per FR-024). If the live stream also fails, surface the error.

**Alternatives considered**:
- **Buffering the entire track before playing**: Rejected — would violate the 2-second start requirement for large FLAC files and waste bandwidth for tracks the user might skip.
- **Implementing a custom streaming buffer**: Over-engineering — Howler's `html5: true` mode already uses the browser's native buffering; catching the error and retrying is simpler.

---

## R-008: Auto-Play After Load

**Decision**: Call `howl.play()` immediately after `Howl` construction in `loadTrack`, rather than requiring a separate `play()` call.

**Rationale**: The current `NowPlayingPage` calls `player.loadTrack(current, onEnd)` in a `useEffect` but never explicitly calls `player.play()` after the load completes. The `Howl` is created but not played, which is why no audio is heard. The fix is straightforward: call `play()` after the `Howl` is constructed.

**Implementation approach**:

1. In `usePlayer.loadTrack`, after `howlRef.current = howl`, immediately call `howl.play()`.
2. The `onplay` callback already sets `setPlaying(true)`, so the UI state updates automatically.
3. If autoplay is blocked, the `onplayerror` handler catches it (see R-003).

**Alternatives considered**:
- **Using Howler's `autoplay: true` option**: Viable but less controllable — auto-play happens during construction, before we've set up all the state. Explicitly calling `play()` after setup gives us control over the timing and error handling.
