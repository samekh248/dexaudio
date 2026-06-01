# Contract: Stream Endpoint (Lossless Extension)

Extends the existing `GET /api/v1/stream/:trackId` audio proxy. Backward compatible: behavior with no new query parameter is unchanged.

## Request

```
GET /api/v1/stream/{trackId}?quality={auto|lossless}
```

| Param | In | Type | Required | Default | Description |
|-------|----|------|----------|---------|-------------|
| `trackId` | path | string | yes | — | Plex track/rating key. |
| `quality` | query | `"auto" \| "lossless"` | no | `auto` | `lossless` requests the original file for lossless-candidate formats; `auto` (or absent) preserves current behavior. |
| `Range` | header | string | no | — | Unchanged. Real seeks (`bytes=N-`, N>0) are honored; `bytes=0-` is treated as a full load (existing logic). |

Validated by shared `StreamQuerySchema = z.object({ quality: z.enum(["auto","lossless"]).optional() })`.

## Server selection logic

Let `lossless = quality === "lossless"` and `candidate = isLosslessCandidateFormat(track.format)` (FLAC or ALAC).

| Condition | Upstream order tried | Notes |
|-----------|---------------------|-------|
| `lossless && candidate` | `[getStreamUrl (original file), getTranscodeUrl]` | Prefer direct lossless; transcode only if direct fails. |
| `!lossless` and not browser-native | `[getTranscodeUrl, getStreamUrl]` | **Unchanged** current behavior. |
| browser-native format | `[getStreamUrl, getTranscodeUrl]` | **Unchanged**. |

## Response

- **200** (full load) or **206** (genuine seek) with audio bytes — unchanged streaming semantics.
- Headers (additions in **bold**):
  - `content-type`: upstream audio content type (e.g., `audio/flac`, `audio/mp4`, `audio/mpeg`).
  - `accept-ranges: bytes`
  - `cache-control: no-store`
  - **`x-dexaudio-audio-quality: lossless | transcoded`** — reflects what was actually served (set from which upstream URL succeeded).
- **401** `AUTH_EXPIRED`, **404** track not found, **415** `UNSUPPORTED_FORMAT` — unchanged.

## Contract tests (backend)

1. `?quality=lossless` on a FLAC track → original file is requested first; response header `x-dexaudio-audio-quality: lossless`.
2. `?quality=lossless` on an ALAC track → original file first; header `lossless`.
3. `?quality=lossless` on an MP3 track → unchanged native path; header `transcoded` (not a lossless candidate).
4. No `quality` param on a FLAC track → transcode tried first (current behavior); header `transcoded`.
5. `?quality=lossless` but direct file upstream fails → falls back to transcode; header `transcoded`.
6. Invalid `quality` value → 400 (schema rejects) OR coerced to `auto` — choose schema rejection for strictness.
