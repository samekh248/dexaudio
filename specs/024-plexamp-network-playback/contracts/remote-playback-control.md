# Contract: Remote Playback Control API

**Version**: `/api/v1`  
**Date**: 2026-06-03  
**Consumers**: `frontend` remote orchestrator, backend `plex-remote-service`

## Overview

Proxy Plex Remote Control commands to the selected network player. All endpoints require an active Plex connection.

---

## `POST /plex/players/{clientId}/play`

Start or replace playback for a track with optional full queue sync.

### Request body

```typescript
{
  ratingKey: string;           // current track
  queue?: {
    ratingKeys: string[];      // full in-app order
    startIndex: number;        // currentIndex
  };
  offsetMs?: number;           // default 0
}
```

### Response `204`

Playback command accepted (queue sync may continue async).

### Response `200` (degraded)

```typescript
{ degraded: true; message: string } // playQueues failed; track-by-track fallback
```

### Errors

| Status | `code` (optional) | Meaning |
|--------|-------------------|---------|
| `400` | `INVALID_TRACK` | Missing rating key |
| `404` | `PLAYER_NOT_FOUND` | Client gone |
| `503` | `PLAYER_UNREACHABLE` | LAN/remote control failure |

---

## `POST /plex/players/{clientId}/control`

Transport commands (FR-006).

### Request body

```typescript
{
  action: "pause" | "resume" | "stop" | "skipNext" | "skipPrevious" | "seek";
  seekToMs?: number;   // required for seek
}
```

### Response `204`

### Errors

Same as play; `501` + message when action unsupported on player (FR edge: limited clients).

---

## `PUT /plex/players/{clientId}/queue`

Replace remote queue to mirror in-app queue (FR-007). Does not change current track unless `interruptPlayback`.

### Request body

```typescript
{
  ratingKeys: string[];
  currentIndex: number;
  interruptPlayback?: boolean; // default false
  queueRevision: number;       // client monotonic id for stale response discard
}
```

### Response `204`

### Response `409`

```typescript
{ queueRevision: number; error: string } // stale revision; client should retry
```

---

## `POST /plex/players/{clientId}/switch-away`

Called when user selects **This device** (FR-013). Idempotent `stop` on player.

### Response `204`

---

## Server behavior summary

1. Resolve `PlexConfig` from `plex_connections` (with reconnect via `machineIdentifier` if needed).
2. Resolve player `uri` from cached discovery or `GET /clients`.
3. Execute Plex Remote Control / PlayQueues HTTP against player or PMS.
4. Never log raw tokens; surface `lastError` text safe for UI (FR-011).
