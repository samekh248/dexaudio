# Contract: Network Players API

**Version**: `/api/v1`  
**Date**: 2026-06-03  
**Consumers**: `frontend` (`api-client.ts`), Fastify routes under `plex` or `playback`

## Overview

Discover Plex music players on the LAN via the connected PMS and expose stable DTOs for the output selector. Tokens stay server-side.

---

## `GET /plex/players`

List eligible network music players.

### Query

| Param | Type | Notes |
|-------|------|--------|
| `refresh` | boolean | Optional; force re-probe reachability |

### Response `200`

```typescript
{
  refreshedAt: string; // ISO-8601
  players: Array<{
    clientIdentifier: string;
    name: string;
    product: string;
    device?: string;
    platform?: string;
    reachable: boolean;
    supportsSeek: boolean;
    supportsQueueSync: boolean;
  }>;
  emptyReason?: "no_players" | "remote_control_disabled" | "server_unreachable";
}
```

### Errors

| Status | Meaning |
|--------|---------|
| `401` | No Plex connection |
| `503` | PMS unreachable |

---

## `GET /plex/players/{clientId}/status`

Poll playback state for Now Playing sync (FR-008).

### Response `200`

```typescript
{
  clientIdentifier: string;
  state: "playing" | "paused" | "stopped" | "idle" | "unknown";
  ratingKey: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  positionMs: number;
  durationMs: number;
  queueItemId?: string | null; // if exposed by player
}
```

### Errors

| Status | Meaning |
|--------|---------|
| `404` | Unknown client |
| `503` | Player unreachable |

---

## Client preference (no REST)

Stored in browser `localStorage`:

```typescript
// key: dexaudio.playback.output
type PlaybackOutputPreference =
  | { mode: "local" }
  | {
      mode: "network";
      clientIdentifier: string;
      displayName: string;
      product: string;
    };
```

Cleared when Plex auth completes with server/account change (FR-014), same hook as `clearAllClientData`.
