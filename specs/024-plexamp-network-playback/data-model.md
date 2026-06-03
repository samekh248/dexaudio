# Data Model: Network Plex Music Player Playback

**Feature**: 024-plexamp-network-playback  
**Date**: 2026-06-03

## Overview

Adds **network player discovery**, **remote playback control**, **queue sync state**, and **client-side output preference**. Plex credentials remain in PostgreSQL (`plex_connections`); no new relational tables for v1.

---

## Entities

### NetworkPlayer (API view, ephemeral)

A Plex client eligible for music remote control.

| Field | Type | Rules |
|-------|------|--------|
| `clientIdentifier` | string | Stable Plex machine id; primary key in API |
| `name` | string | Display name (FR-012) |
| `product` | string | e.g. `Plexamp`, `Plex Web` — shown as player type |
| `device` | string? | Optional device label |
| `platform` | string? | Optional OS |
| `address` | string? | Host/IP for diagnostics only |
| `reachable` | boolean | Last probe succeeded |
| `supportsSeek` | boolean | From player capabilities probe |
| `supportsQueueSync` | boolean | `true` if Play Queues path works |

**Validation**: Excluded if not music-capable or DexAudio self-client (FR-016).

---

### PlaybackOutput (client state)

User’s selected audio destination.

| Field | Type | Rules |
|-------|------|--------|
| `mode` | enum | `local` \| `network` |
| `clientIdentifier` | string? | Required when `mode=network` |
| `displayName` | string? | Cached from last discovery |
| `product` | string? | Cached player type |

**Persistence**: `localStorage` key `dexaudio.playback.output` (see contracts).

**Lifecycle**:

```text
[default] → local
select network player → mode=network + clientIdentifier
switch to local → stop remote → mode=local
Plex re-auth / server change → reset to local, clear preference
```

---

### RemotePlaybackSession (client + server session)

Active control session while `mode=network`.

| Field | Type | Rules |
|-------|------|--------|
| `clientIdentifier` | string | Target player |
| `playQueueId` | string? | Plex play queue id when queue sync active |
| `activeRatingKey` | string? | Current track on player |
| `state` | enum | `playing` \| `paused` \| `stopped` \| `idle` \| `unknown` |
| `positionMs` | number | From player status poll |
| `durationMs` | number | From player status |
| `lastSyncAt` | ISO datetime | Last successful queue sync |
| `syncError` | string? | Last queue sync failure |
| `degradedMode` | boolean | `true` if using playMedia fallback |

**Lifecycle**: Created on first remote play; cleared on output switch to local or stop.

---

### QueueSyncOperation (logical)

Mirrors in-app queue to remote Play Queue.

| Field | Type | Rules |
|-------|------|--------|
| `queueRevision` | number | Monotonic; bump on add/remove/reorder |
| `items` | `{ ratingKey, title }[]` | From `playback-queue-store` |
| `currentIndex` | number | Active row |
| `interruptPlayback` | boolean | `true` only when active item removed/skipped past |

**Validation**: Must complete ≤5 s (FR-007); must not interrupt current track unless `interruptPlayback` (clarification queue sync).

---

### PlayerDiscoveryResult (API aggregate)

| Field | Type | Rules |
|-------|------|--------|
| `players` | NetworkPlayer[] | May be empty |
| `refreshedAt` | ISO datetime | |
| `emptyReason` | enum? | `no_players` \| `remote_control_disabled` \| `server_unreachable` |

---

## Relationships

```text
PlaybackOutput (1) ──selects──▶ (0..1) NetworkPlayer
RemotePlaybackSession (1) ──targets──▶ (1) NetworkPlayer
RemotePlaybackSession (1) ──syncs──▶ (1) QueueSyncOperation
playback-queue-store (in-app) ──source of truth──▶ QueueSyncOperation
```

---

## Integration with existing models

| Existing | Interaction |
|----------|-------------|
| `Track.id` | Plex `ratingKey` for `playMedia` / play queue URIs |
| `playback-queue-store` | Authoritative queue; drives `QueueSyncOperation` |
| `plex_connections` | Supplies `serverUrl`, `token`, `machineIdentifier` for discovery/control |
| `plex_timeline_outbox` | No new events when `mode=network` |
| `scrobble-tracker` | Uses logical session from remote poll when `mode=network` |
| `AppSettings.plexPlaybackReporting` | Ignored for timeline posts when `mode=network` |

---

## State transitions (remote)

```text
idle → playing (play + queue sync ok)
playing → paused (pause command)
paused → playing (resume)
playing → playing (next track / queue advance)
* → stopped (switch to local / stop command / player offline)
```
