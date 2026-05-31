# Data Model: Live Recently Played Updates

**Feature**: 017-live-recently-played  
**Date**: 2026-05-30

## Overview

This feature adds **no persisted entities**. It introduces a **client-side coordinator state machine** and reuses existing **Album** / **AlbumGroupResponse** shapes from the library group API. Plex play activity remains server-side (015 + Plex Media Server).

---

## Logical entities

### RecentlyPlayedRefreshSession (in-memory, coordinator)

Ephemeral state for one dwell → fetch cycle.

| Field | Type | Rules |
|-------|------|--------|
| `targetAlbumId` | string | Album that must play ≥ 5 s to trigger fetch |
| `libraryId` | string | Active library from `StorageKeys.activeLibraryId` |
| `dwellStartedAt` | number (ms) | Monotonic clock when dwell began |
| `generation` | int | Incremented on album change; stale fetches ignored |
| `phase` | enum | `idle` \| `dwelling` \| `fetching` |
| `retryAttempt` | int | 0–2 within 15 s post-dwell window |

**Lifecycle**:

```text
[idle]
  └─ audible album B ≠ lastAlbum → dwelling (5s timer, gen++)
       ├─ album changes before 5s → cancel → dwelling for new album
       ├─ 5s elapsed → fetching (refetch recently-played queries)
       │    ├─ success → idle
       │    ├─ Plex lag (optional album check) → retry ≤15s → idle
       │    └─ album changes mid-fetch → abort/ignore → dwelling for new album
       └─ resume / same album track → no transition
```

---

### RecentlyPlayedQueryScope (TanStack Query key)

Identifies cache entries to refetch.

| Key segment | Value | Example |
|-------------|-------|---------|
| Root | `"album-group"` | fixed |
| Group | `"recently-played"` | fixed |
| Library | `libraryId` | `"1"` |
| Limit | `10` \| `20` | home vs View all |

**Invariant**: Refetch MUST NOT use key prefix `["album-group"]` alone (would match all groups).

---

### AudibleAlbumChange (event)

Signal from `use-player` to coordinator.

| Field | Type | Rules |
|-------|------|--------|
| `albumId` | string | Required; from `Track.albumId` |
| `trackId` | string | For logging/tests only |
| `isResume` | boolean | Must be `false` for coordinator to act |
| `timestamp` | number | When audible playback confirmed |

**Validation**:

- Ignore if `albumId === lastScheduledAlbumId` and still dwelling/fetching for same album (idempotent).
- Ignore if `albumId === lastAudibleAlbumId` and event is same-album track change.
- Ignore if reporting disabled or no Plex connection.

---

## Reused entities (unchanged)

### Album / AlbumGroupResponse

From `@dexaudio/shared-types` — Recently Played items ranked by Plex 30-day play count. See specs 003/008.

### Track

`albumId?: string` — **must** be populated for coordinator; sourced from Plex `parentRatingKey`.

---

## State transitions (UI)

| Query state | UI behavior |
|-------------|-------------|
| `isPending` | Existing row skeleton (first load) |
| `isSuccess && isFetching` | Previous cards visible + subtle heading spinner (`aria-busy`) |
| `isSuccess && !isFetching` | Updated cards |
| `isError` | Existing error + Retry button |

---

## Relationships

```text
use-player (audible album change)
    → recently-played-refresh-coordinator
        → TanStack Query refetch
            → GET /api/v1/library/albums/groups/recently-played?limit=N
                → targeted-library-service (Plex play counts)
plex-playback-reporter (015, parallel)
    → POST /api/v1/plex/timeline
        → Plex server play history
```
