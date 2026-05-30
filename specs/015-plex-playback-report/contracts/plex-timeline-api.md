# Contract: Plex Timeline Reporting API

**Version**: `/api/v1`  
**Date**: 2026-05-30  
**Consumers**: `frontend` (`api-client.ts`), `backend` Fastify routes

## Overview

Dexaudio accepts timeline intents from the player and forwards them to the user’s Plex Media Server using stored credentials. Failures are queued for retry.

---

## `POST /plex/timeline`

Submit a playback state update for a Plex-sourced track.

### Request body

```typescript
{
  ratingKey: string;      // Track.id (Plex rating key)
  state: "playing" | "paused" | "stopped" | "buffering";
  timeMs: number;         // >= 0, view offset
  durationMs: number;     // > 0
  sessionKey: number;     // Client-generated, stable per track play
}
```

### Responses

| Status | Body | Meaning |
|--------|------|---------|
| `204` | — | Accepted and delivered to Plex (or no-op when reporting disabled) |
| `202` | `{ queued: true }` | Plex unreachable; stored in outbox |
| `400` | `ErrorBody` | Invalid payload |
| `401` / `503` | `ErrorBody` | No Plex connection / server unreachable |

### Server behavior

1. If `plexPlaybackReporting.enabled === false` → `204` without calling Plex.
2. If no `plex_connections` row → `401`.
3. Build `GET {serverUrl}/:/timeline?...` with `plexMediaHeaders(token)` and query params:
   - `ratingKey`, `key=/library/metadata/{ratingKey}`, `state`, `time`, `duration`
   - `sessionKey`, `X-Plex-Product=DexAudio`, existing client identifier headers
4. On network/5xx failure → enqueue `plex_timeline_outbox`, return `202`.

---

## `GET /plex/reporting/status`

Reporting health for Plex Settings UI (FR-010).

### Response `200`

```typescript
{
  enabled: boolean;
  connected: boolean;
  pending: number;
  lastError: string | null;
}
```

---

## `POST /plex/reporting/retry`

Drop expired outbox rows and attempt delivery of pending items (mirror `POST /lastfm/scrobbles/retry`).

### Response `200`

```typescript
{
  status: "retry_initiated";
  pending: number;
}
```

---

## Settings extension (`PATCH /settings`)

Add optional field to existing `AppSettings`:

```typescript
plexPlaybackReporting?: {
  enabled: boolean; // default true when absent
};
```

---

## Upstream: Plex Media Server

**Endpoint**: `GET {serverUrl}/:/timeline`  
**Auth**: `X-Plex-Token` + client headers (see `plexMediaHeaders`)

**Not exposed to browser** — backend only.

Reference: [Report media timeline](https://plexapi.dev/api-reference/timeline/report-media-timeline)

---

## Frontend reporter contract

Module: `plex-playback-reporter.ts`

| Function | When |
|----------|------|
| `onPlaybackStart(track, sessionKey)` | Audible start |
| `onPlaybackProgress(track, timeMs, sessionKey)` | Heartbeat ~10 s, after seek |
| `onPlaybackPause(track, timeMs, sessionKey)` | Pause |
| `onPlaybackResume(track, timeMs, sessionKey)` | Resume |
| `onPlaybackStop(track, timeMs, sessionKey)` | End, skip, halt |

Each calls `api.postPlexTimeline(...)`; errors are non-fatal (FR-012).

`use-player.ts` MUST call these at the same lifecycle points as `scrobble-tracker` (start, position update, track end).
