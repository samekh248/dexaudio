# Contract: Track Waveform Endpoint

**Feature**: 026-now-playing-waveform  
**Type**: REST API (`/api/v1`)

Proxies Plex loudness levels for the Now Playing waveform visualization.

## Request

```
GET /api/v1/library/tracks/{trackId}/waveform
```

| Param | In | Type | Required | Default | Description |
|-------|----|------|----------|---------|-------------|
| `trackId` | path | string | yes | — | Plex track rating key |
| `subsample` | query | integer | no | `256` | Max number of level samples returned (forwarded to Plex `subsample` when supported) |

Validated by `TrackWaveformQuerySchema` in `shared-types`.

## Server behavior

1. Load Plex config from DB (same as stream routes). If missing → **404** `plex_not_connected`.
2. `fetchTrackStreamContext(trackId)` → require `track` and `audioStreamId`.
   - No `audioStreamId` → **404** `{ code: "waveform_unavailable" }` (no analysis stream).
3. `GET {plex}/library/streams/{audioStreamId}/levels?subsample={n}` with `plexMediaHeaders`.
   - **200** → parse JSON `MediaContainer.Level[].v`, normalize to 0–1, build `TrackWaveform`.
   - **404** → **404** `waveform_unavailable` (Plex has no loudness for this track).
   - **401** → **401** `AUTH_EXPIRED` (align with stream routes).
   - Other errors → **502** `BadGatewayError` with safe message.

## Response

**200** `application/json`:

```json
{
  "trackId": "12345",
  "samples": [0.12, 0.45, 0.8],
  "sampleIntervalMs": 100,
  "durationMs": 240000
}
```

Shape enforced by `TrackWaveformSchema` (Zod) in `@dexaudio/shared-types`.

## Error responses

| Status | When |
|--------|------|
| 401 | Plex token invalid |
| 404 | Not connected, track missing, no audio stream id, or Plex levels 404 |
| 502 | Plex unreachable or unexpected payload |

No **200** with empty `samples` — treat as 404 unavailable.

## Contract tests (backend)

1. Track XML with audio `Stream id="99"` → Plex levels URL uses `99`.
2. Valid Plex levels JSON → normalized samples length ≤ subsample; `durationMs` matches metadata.
3. Plex levels 404 → API 404 `waveform_unavailable`.
4. Track XML without Stream → 404 without calling Plex levels.
5. Invalid `subsample` (0 or >2000) → 400 validation error.
