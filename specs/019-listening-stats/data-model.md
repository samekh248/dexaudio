# Data Model: Listening Stats Dashboard

## Persistent entities (PostgreSQL / Drizzle)

### `scrobbles` (NEW)

One row per recorded listen, synced from Last.fm (primary) or sourced from Plex.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK, default random | |
| `played_at` | `timestamptz NOT NULL` | Absolute UTC instant of the play. **Indexed.** |
| `track` | `text NOT NULL` | Track title. |
| `artist` | `text NOT NULL` | Artist name. |
| `album` | `text` | Album title (nullable; some scrobbles lack album). |
| `artist_mbid` | `text` | MusicBrainz artist id (optional). |
| `album_mbid` | `text` | MusicBrainz album id (optional). |
| `image_url` | `text` | Artwork URL from Last.fm `extended=1` (optional). |
| `source` | `scrobble_source` enum `NOT NULL` | `'lastfm' \| 'plex'`. |

**Constraints / indexes**:
- `UNIQUE (played_at, track, artist)` → dedupe key; inserts use `ON CONFLICT DO NOTHING` (FR-016, FR-023).
- `INDEX (played_at)` → period filtering + `date_trunc`/`EXTRACT` aggregation performance (SC-007).

**New enum**: `scrobble_source = ('lastfm', 'plex')`.

### `lastfm_accounts` (EXTEND existing)

Existing columns: `id uuid PK`, `session_key_encrypted bytea`, `connected boolean`, `last_error text`.

| New Column | Type | Notes |
|------------|------|-------|
| `username` | `text` | Last.fm username for history reads (FR-012). |
| `last_synced_at` | `timestamptz` | Cursor for incremental sync (`from`) + UI "last synced" (FR-015, FR-018). |
| `total_scrobbles` | `integer` | From `user.getInfo` playcount; for progress display. |
| `sync_status` | `sync_status` enum, default `'idle'` | `'idle' \| 'syncing' \| 'error'` (FR-018, FR-023). |
| `synced_pages` | `integer`, default `0` | Backfill progress numerator. |
| `total_pages` | `integer` | Backfill progress denominator. |

**New enum**: `sync_status = ('idle', 'syncing', 'error')`.

> Single-row table (single-user app); all queries use `… LIMIT 1` / first row, matching existing `lastfm.ts` and Discogs patterns.

### Migration

`backend/drizzle/0011_listening_stats.sql`, generated via `pnpm/npm run db:generate` after editing `backend/src/db/schema.ts`. Creates the two enums, the `scrobbles` table + indexes, and the new `lastfm_accounts` columns.

## State transitions — sync lifecycle

`sync_status` on `lastfm_accounts`:

```text
idle ──(connect username / scheduled tick)──▶ syncing
syncing ──(success)──▶ idle        (last_synced_at = newest played_at; synced_pages = total_pages)
syncing ──(error)────▶ error       (last_error set)
error ──(next scheduled tick / reconnect)──▶ syncing   (retry; dedupe makes it safe)
```

- Backfill (first sync, `last_synced_at` null): page from newest → oldest, incrementing `synced_pages`/`total_pages`.
- Incremental (`last_synced_at` set): fetch `from = last_synced_at` forward; usually a single page.
- Scheduler skips a tick while `sync_status === 'syncing'` (no overlap).

## Computed/response shapes (shared-types — NOT persisted)

Added to `packages/shared-types/src/api/schemas.ts` as Zod schemas + inferred types.

### `StatsPeriod`
`z.enum(['7d','1m','3m','6m','12m','all'])`

### `StatsSource`
`z.enum(['lastfm','plex'])`

### `TopEntry`
| Field | Type | Notes |
|-------|------|-------|
| `label` | string | Artist/album/track name. |
| `sub` | string optional | Supporting detail (e.g., artist for an album/track). |
| `count` | int ≥ 0 | Play count. |
| `imageUrl` | string optional | Artwork (placeholder when absent — Edge Cases). |

### `ListeningOverview`
| Field | Type | Notes |
|-------|------|-------|
| `period` | `StatsPeriod` | Echoes request. |
| `source` | `StatsSource` | Which source produced figures (FR-004). |
| `totalPlays` | int ≥ 0 | Plays in period. |
| `totalPlaysAllTime` | int ≥ 0 | All-time plays. |
| `uniqueArtists` | int ≥ 0 | |
| `uniqueAlbums` | int ≥ 0 | |
| `uniqueTracks` | int ≥ 0 | |
| `avgPlaysPerDay` | number ≥ 0 | |
| `busiestDate` | `{ date: string (ISO date); count: int }` nullable | Peak calendar date in period (clarification). |
| `busiestWeekday` | `{ weekday: 0–6; count: int }` nullable | Busiest day-of-week (clarification). |
| `topArtists` | `TopEntry[]` (≤10) | |
| `topAlbums` | `TopEntry[]` (≤10) | |
| `topTracks` | `TopEntry[]` (≤10) | |

### `TimeSeriesPoint`
`{ bucket: string (ISO date); count: int ≥ 0 }`

### `ListeningPatterns`
| Field | Type | Notes |
|-------|------|-------|
| `period` | `StatsPeriod` | |
| `source` | `StatsSource` | |
| `granularity` | `z.enum(['day','week','month'])` | Auto-selected (R5). |
| `playsOverTime` | `TimeSeriesPoint[]` | Zero-filled. |
| `clock` | `{ hour: 0–23; count: int }[]` (len 24) | Viewer-local hour (FR-011a). |
| `weekday` | `{ weekday: 0–6; count: int }[]` (len 7) | Viewer-local DOW. |
| `calendar` | `{ date: string; count: int }[]` | Per-day counts for heatmap. |

### `LastfmSyncStatus`
| Field | Type | Notes |
|-------|------|-------|
| `connected` | boolean | |
| `username` | string nullable | |
| `status` | `sync_status` (`'idle'\|'syncing'\|'error'`) | |
| `lastSyncedAt` | string (ISO) nullable | |
| `totalScrobbles` | int nullable | |
| `syncedPages` | int | |
| `totalPages` | int nullable | |
| `lastError` | string nullable | |

### `LastfmConnectionInput` (extend)
Current: `{ sessionKey: string }`. Extend to `{ sessionKey?: string; username?: string }` (at least one required) so the username can be saved independently and trigger backfill.

## Validation rules

- `tz` query param validated against IANA names; invalid → `UTC` fallback (R4).
- `period` must be a `StatsPeriod`; invalid → 400.
- `granularity` optional; if omitted, server auto-selects per R5; if provided, must be `day|week|month`.
- Top lists capped at 10 (FR-007).
- Empty period → zeroed overview / empty arrays, HTTP 200 (FR-024, not an error).
