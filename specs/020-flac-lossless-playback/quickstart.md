# Quickstart: Verifying Lossless FLAC Playback

Manual verification mapped to the spec's user stories. Assumes a connected Plex server with at least one FLAC album (and ideally one ALAC album) and the dev servers running (`backend` + `frontend`).

## Prerequisites

- Plex connected; library contains FLAC tracks.
- A modern browser that decodes FLAC (Chrome/Edge/Firefox, or Safari 16+).
- Dev tools Network tab open to inspect the `/api/v1/stream/...` request.

## US1 — Hear FLAC at lossless quality (P1)

1. Open Settings → Playback. Confirm **Lossless playback** is **on by default**.
2. Play a FLAC track.
3. In the Network tab, confirm the stream request is `GET /api/v1/stream/{id}?quality=lossless` and the response `content-type` is `audio/flac` with header `x-dexaudio-audio-quality: lossless`.
4. Confirm the now-playing area shows a **Lossless** indicator.
5. Play an MP3 track → request has no `quality=lossless`; indicator shows **Transcoded** (or no lossless badge). Lossless setting causes no adverse effect.

## US2 — Automatic fallback (P1)

1. **Unsupported browser**: In a browser/profile without FLAC decode (or stub `canPlayType` to return `""`), play a FLAC track. Confirm no `quality=lossless` request is made, playback uses transcoding, and it is not retried losslessly.
2. **Stream error**: Force the lossless upstream to fail (e.g., temporarily break the direct-file path) and play a FLAC track. Confirm the player downgrades to transcoded and playback continues; indicator flips to **Transcoded**.
3. **Bandwidth stall**: Throttle the network (DevTools "Slow 3G") and play a large FLAC track. Confirm that after the existing stall window (~10s) the track downgrades to transcoded and **resumes at the current position** (not restarted).
4. **Recovery**: Remove the throttle, play the next FLAC track → lossless is attempted again (fallback was per-track, not sticky).

## US3 — Understand & control quality (P2)

1. Toggle **Lossless playback** off in Settings; reload the app → setting remains off.
2. Toggle it back on; reload → setting remains on.
3. While a track is playing, view now-playing → the indicator correctly reads **Lossless** or **Transcoded**, including after a fallback.

## Caching / offline (FR-015)

1. With lossless on, let pre-cache run (or pin a FLAC album). Confirm cached blobs are the lossless originals (larger size; `audio/flac`).
2. Go offline and play a cached FLAC track → plays losslessly from cache.
3. Confirm cache-capacity prompts still appear when approaching the configured caps.

## Regression checks (FR-014)

- Gapless and crossfade transitions still work across FLAC tracks.
- Queue add/reorder/remove unaffected.
- Plex playback reporting / scrobble still fires.

## Automated tests to run

```bash
# from repo root
npm --workspace frontend run test
npm --workspace backend run test
```

Key new tests: `audio-capability`, `lossless-prefs-store`, `stream-audio` URL/format, `use-player` lossless→transcoded downgrade (using the fake audio engine), and backend `stream` route quality selection.
