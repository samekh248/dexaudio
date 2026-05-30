# Research: Plex Playback Reporting (015-plex-playback-report)

**Date**: 2026-05-30  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All technical unknowns resolved; no `NEEDS CLARIFICATION` remains.

---

## 1. Plex mechanism for “what is playing”

**Decision**: Use Plex Media Server’s **`GET /:/timeline`** “report media timeline” endpoint (documented in [Plex API — Report media timeline](https://plexapi.dev/api-reference/timeline/report-media-timeline)).

**Required behavior** (per Plex):

- Call on every play-state change (`playing`, `paused`, `stopped`, and optionally `buffering`).
- While state is unchanged, call periodically (~**10 s** on LAN/WAN; ~20 s on cellular — we use **10 s** for a desktop PWA).
- Include `ratingKey`, metadata `key` (`/library/metadata/{ratingKey}`), `state`, `time` (view offset ms), `duration` (ms), plus standard `X-Plex-*` client headers.

**Rationale**: Matches clarified spec (“native Plex lifecycle”; Plex decides play-history eligibility). This is how Plex Web and Plex Media Player update activity, Recently Played, and server-side stats consumed by Dexaudio’s Top 10.

**Alternatives considered**:

- **Plex “scrobble”-style custom threshold in-app** — rejected in clarification; duplicates Plex rules and diverges from native clients.
- **Server-Sent Events only (listen, don’t report)** — read-only; does not satisfy FR-001–FR-004.
- **plex.tv account APIs** — wrong host; timeline targets the **local Plex server** URL already stored in `plex_connections`.

---

## 2. Where timeline calls execute

**Decision**: **Backend proxy** — frontend posts timeline intents to Dexaudio REST; backend calls `{serverUrl}/:/timeline` with the encrypted per-server token and `plexMediaHeaders()`.

**New endpoints** (see [contracts/plex-timeline-api.md](./contracts/plex-timeline-api.md)):

- `POST /api/v1/plex/timeline` — accept timeline payload; deliver or enqueue.
- `GET /api/v1/plex/reporting/status` — enabled flag, pending outbox count, last error.
- `POST /api/v1/plex/reporting/retry` — flush pending outbox (mirrors Last.fm retry pattern).

**Rationale**: Same security model as Plex auth and streaming (Constitution III): tokens never exposed to the browser; avoids CORS to arbitrary Plex server origins.

**Alternatives considered**:

- **Browser → Plex direct** — rejected; exposes token and fights CORS.
- **Fire-and-forget with no outbox** — rejected; fails FR-008 / SC-003 for brief outages.

---

## 3. Client identity (DexAudio)

**Decision**: Set `X-Plex-Product` (and device display name where applicable) to **`DexAudio`**, aligned with FR-014. Update `PLEX_PRODUCT_NAME` in `backend/src/lib/config.ts` from `"Dex Audio"` → `"DexAudio"` (clarification 2026-05-30). Keep stable `PLEX_CLIENT_ID` (`dex-audio-player`).

**Rationale**: Users verify SC-006 in Plex activity; product string must match spec literally.

---

## 4. Track identity mapping

**Decision**: `Track.id` from the existing Plex library parsers **is** the Plex `ratingKey`. Timeline requests use:

- `ratingKey` = `track.id`
- `key` = `/library/metadata/{track.id}`
- `duration` = `track.durationMs`

**Rationale**: Confirmed in `plex-client.ts` (`id: attrs.ratingKey`). No new ID field on `Track` for v1.

---

## 5. Play session key

**Decision**: Generate a numeric **`sessionKey`** (random 32-bit integer) when a Plex-sourced track begins; reuse for all timeline updates for that track until `stopped`, then rotate on the next track.

**Rationale**: Plex play-session notifications correlate updates by `sessionKey`; stable per track avoids splitting one listen across sessions.

---

## 6. Settings and enablement

**Decision**: Store `plexPlaybackReporting.enabled` (default `true`) in server **`app_settings`** via existing `GET/PATCH /api/v1/settings` (`AppSettings` schema extension). UI toggle in **`PlexSettingsSection`** reads/writes this field.

**Rationale**: Clarification places controls in Plex Settings; server-side setting matches Last.fm connection pattern and allows reporting status API without new credential stores.

---

## 7. Retry / outbox

**Decision**: PostgreSQL table **`plex_timeline_outbox`** (parallel to `scrobble_outbox`): payload JSON, `expiresAt` (+24 h from enqueue), `status`, `retryCount`, `lastError`. On `POST /plex/timeline` failure, enqueue; background flush on retry endpoint and opportunistically after successful posts.

**Rationale**: FR-008; same durability model users already understand from Last.fm pending scrobbles.

---

## 8. Frontend integration point

**Decision**: New module `frontend/src/lib/plex-playback-reporter.ts`, wired from `use-player.ts` alongside `scrobble-tracker.ts`:

| Player event | Timeline `state` |
|--------------|------------------|
| Audible start | `playing` |
| Pause | `paused` |
| Resume | `playing` |
| Seek settled | `playing` (updated `time`) |
| Skip / end / halt | `stopped` on old track; `playing` on new |
| 10 s interval while playing | `playing` (heartbeat) |

Gated by settings + valid Plex connection; never blocks playback (FR-012).

**Rationale**: `use-player` already centralizes lifecycle after 014 refactor; mirrors scrobble hook points without coupling Howler internals to HTTP.

---

## 9. Cached / offline plays

**Decision**: Still report when `Track` is Plex-sourced and connection/token valid, even if audio bytes come from IndexedDB cache.

**Rationale**: FR-007; metadata IDs remain valid on the server.

---

## 10. Rate limiting and coalescing

**Decision**: Coalesce heartbeats: at most one progress report per 10 s per active track; always send immediate reports on state transitions (debounce 300 ms on rapid seek bursts).

**Rationale**: Plex documents ~10 s heartbeat; prevents flooding on seek scrubbing while meeting FR-002 “within a few seconds” after seek completes.
