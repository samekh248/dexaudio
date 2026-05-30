# Data Model: Plex Playback Reporting

**Feature**: 015-plex-playback-report  
**Date**: 2026-05-30

## Overview

Playback reporting adds **timeline events** (ephemeral play state sent to Plex) and a **retry outbox** (durable queue for failed deliveries). Settings reuse `app_settings`. No changes to `plex_connections` schema beyond reads.

---

## Entities

### TimelineEvent (logical, not persisted)

A single report to Plex’s `/:/timeline` endpoint.

| Field | Type | Rules |
|-------|------|--------|
| `ratingKey` | string | Plex track id; equals `Track.id` |
| `key` | string | `/library/metadata/{ratingKey}` |
| `state` | enum | `playing` \| `paused` \| `stopped` \| `buffering` |
| `time` | int ms | View offset; 0 on start |
| `duration` | int ms | From `Track.durationMs` |
| `sessionKey` | int | Stable per track play; new on track change |
| `context` | object | Optional; library section id when known |

**Lifecycle**:

```text
[start track] → playing (time≈0)
   ├─ periodic → playing (time updated every ~10s)
   ├─ pause → paused
   ├─ resume → playing
   ├─ seek → playing (time jump)
   └─ [end/skip/stop] → stopped
[next track] → new sessionKey, playing on new ratingKey
```

Plex server decides whether `stopped` counts toward play history (clarification B).

---

### PlexTimelineOutbox (persisted)

**Table**: `plex_timeline_outbox`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `payload` | jsonb | Serialized `TimelineEvent` + `sessionKey` |
| `retryCount` | int | Default 0 |
| `expiresAt` | timestamptz | `enqueuedAt + 24h` |
| `status` | enum | `pending` \| `submitted` \| `dropped` (reuse `scrobble_status` enum or duplicate) |
| `lastError` | text nullable | Last HTTP/error message |
| `createdAt` | timestamptz | |

**Validation**:

- Drop rows where `expiresAt < now()` (FR-008).
- Deduplicate: optional coalesce pending rows for same `ratingKey` + `state` + `time` within 1 s window to limit queue growth.

---

### PlexPlaybackReportingSettings (persisted)

**Storage**: `app_settings` row `key = 'plexPlaybackReporting'`

```json
{ "enabled": true }
```

| Field | Default | Notes |
|-------|---------|--------|
| `enabled` | `true` | FR-009; when false, API returns 204/no-op without calling Plex |

Also extend typed **`AppSettings`** in `@dexaudio/shared-types` with optional `plexPlaybackReporting?: { enabled: boolean }`.

---

### PlexReportingStatus (derived, API response)

Not a table; computed for `GET /plex/reporting/status`.

| Field | Source |
|-------|--------|
| `enabled` | `app_settings` |
| `pending` | count(`plex_timeline_outbox` where status=pending) |
| `lastError` | latest outbox `lastError` or last failed delivery |
| `connected` | `plex_connections` has valid row |

---

## Relationships

```text
plex_connections (1) ──uses──▶ timeline HTTP to serverUrl
app_settings (1) ──gates──▶ whether timeline is sent
plex_timeline_outbox (*) ──retries──▶ failed timeline HTTP
Track.id ──maps──▶ TimelineEvent.ratingKey
```

---

## State transitions (outbox row)

```text
pending ──success──▶ submitted (delete or archive)
pending ──expired──▶ dropped
pending ──retry fail──▶ pending (retryCount++)
```

---

## Out of scope (data)

- No new Last.fm tables.
- No client-side timeline outbox in v1 (server outbox only; frontend may retry POST like scrobbles).
- No per-user multi-tenant rows (single-server app instance model unchanged).
