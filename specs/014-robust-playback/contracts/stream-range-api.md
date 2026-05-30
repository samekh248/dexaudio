# Contract: Stream Proxy with Byte-Range Support

**Endpoint**: `GET /api/v1/stream/:trackId`
**File**: `backend/src/api/routes/stream.ts`
**Change**: Add HTTP `Range` request handling end-to-end (forward to Plex, propagate `206 Partial Content`). Backward compatible — requests without `Range` behave exactly as today.

## Request

`GET /api/v1/stream/{trackId}`

| Header | Required | Notes |
|--------|----------|-------|
| `Range` | No | e.g., `bytes=1048576-`. When present, the proxy MUST forward it to the upstream Plex stream/transcode URL. |

Path param: `trackId` (string, non-empty).

## Responses

### 200 OK (no Range, or upstream does not support Range)

Full progressive body. Unchanged from current behavior.

| Header | Value |
|--------|-------|
| `content-type` | upstream audio content-type (e.g., `audio/mpeg`) |
| `accept-ranges` | `bytes` |
| `cache-control` | `no-store` |

Body: audio stream (`ReadableStream`).

### 206 Partial Content (Range honored by upstream)

| Header | Value |
|--------|-------|
| `content-type` | upstream audio content-type |
| `accept-ranges` | `bytes` |
| `content-range` | propagated from upstream, e.g., `bytes 1048576-5242879/5242880` |
| `content-length` | length of the returned partial body |
| `cache-control` | `no-store` |

Body: requested byte range of the audio stream.

Status code MUST be set from the upstream response (`reply.code(upstream.status)`); when the upstream returns `206`, the proxy returns `206`.

### Error responses (unchanged taxonomy)

| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_EXPIRED` | Upstream 401 |
| 404 | (NotFound) | Track not found / upstream 404 |
| 415 | `UNSUPPORTED_FORMAT` | No playable format after fallback |
| 502 | `BAD_GATEWAY` | Cannot reach Plex / metadata fetch failed |

## Behavioral rules

1. Preserve the existing source-selection fallback order: native-format → direct stream then transcode; non-native → transcode then direct stream.
2. When a `Range` header is present, include it in the upstream `fetch` headers (alongside `plexMediaHeaders`). If the upstream returns `206`, propagate status + `Content-Range` + `Content-Length`. If the upstream ignores Range and returns `200`, pass through `200` (client falls back to full-buffer seek).
3. Only `isPlayableContentType` bodies are proxied; non-audio upstream responses continue to fall through to the next candidate or error.
4. `cache-control: no-store` is retained (proxy responses are not cached by the browser HTTP cache; the app's own IndexedDB cache is separate).

## Acceptance (maps to FR-012 / SC-007)

- A `Range: bytes=N-` request for a Range-capable upstream returns `206` with a correct `Content-Range` and only the requested bytes.
- Seeking to a late position in a long track issues a Range request and resumes playback within 1 second in ≥99% of attempts.
- A request without `Range` is byte-for-byte equivalent to current behavior (no regression).

## Test notes

`backend/tests/integration/stream-range.test.ts` (supertest): mock upstream Plex `fetch` to assert (a) `Range` is forwarded, (b) `206`/`Content-Range` propagate, (c) `200` passthrough when upstream ignores Range, (d) existing 401/404/415/502 paths unaffected.
