# Data Model: Albums Library View (003-albums-library-view)

**Date**: 2026-05-19
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

This feature introduces **one new table** and makes no destructive changes to existing tables.

### New: `artist_spotlight_state`

Tracks the most recent time each eligible artist was shown in the Artist Spotlights group, enabling the least-recently-shown round-robin selection rule (FR-011, Clarification 2026-05-19 Q3).

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `artist_id` | `text` | NOT NULL (PK) | — | Plex artist `ratingKey` (stable identifier). Primary key. |
| `last_spotlighted_at` | `timestamptz` | NOT NULL | — | Timestamp when this artist was last selected for the Artist Spotlights group. Updated atomically with each selection. |

**Migration** (`backend/drizzle/0009_add_artist_spotlight_state.sql`):

```sql
CREATE TABLE IF NOT EXISTS artist_spotlight_state (
  artist_id text PRIMARY KEY,
  last_spotlighted_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artist_spotlight_state_last_shown
  ON artist_spotlight_state (last_spotlighted_at ASC);
```

The index supports the selection query `ORDER BY last_spotlighted_at ASC NULLS FIRST` (the join with the eligible artist list produces the NULLS-FIRST behaviour for never-shown artists).

**Drizzle schema addition** (`backend/src/db/schema.ts`):

```ts
export const artistSpotlightState = pgTable("artist_spotlight_state", {
  artistId: text("artist_id").primaryKey(),
  lastSpotlightedAt: timestamp("last_spotlighted_at", { withTimezone: true }).notNull(),
});
```

### Rollback

```sql
DROP INDEX IF EXISTS idx_artist_spotlight_state_last_shown;
DROP TABLE IF EXISTS artist_spotlight_state;
```

## In-memory / Derived Entities (no schema change)

These are server-side computation shapes only; they are **not** persisted to PostgreSQL.

### `AlbumWithStats` (backend, internal)

Extends the existing `Album` shared type with two private fields used only for sorting/filtering:

| Field | Source | Used by |
|-------|--------|---------|
| `addedAt: Date` | Plex `Directory@addedAt` (Unix seconds × 1000) | Recently Added rule (FR-007) |
| `userRating: number \| undefined` | Plex `Directory@userRating` (0–10 scale) | Hidden Gems filter (FR-008) |
| `lastPlayedAt: Date \| undefined` | Plex `Directory@lastViewedAt` (Unix seconds × 1000) | Hidden Gems filter + ordering (FR-008) |
| `playCount30d: number` | Computed: count of scrobbles from Plex history in the trailing 30 days *(see below)* | Recently Played rule (FR-006) |

**Computing `playCount30d`**: Plex does not expose a per-album 30-day play count directly. Resolution path:
1. Query `/library/sections/{libraryId}/all?type=10&viewedAt>{now-30d}&X-Plex-Token=…` (tracks viewed in last 30 days), group by `parentRatingKey` (the album rating key), sum `viewCount`. This gives `playCount30d` per album.
2. Alternative if Plex's `viewedAt` filter behaves inconsistently: fall back to `/status/sessions/history?librarySectionID={id}&viewedAt>{now-30d}` and aggregate. Decision deferred to implementation; tests cover both paths via parser unit tests.

### `ArtistSpotlight` (returned to client)

Server-side aggregation result; not persisted.

| Field | Type | Notes |
|-------|------|-------|
| `artistId` | `string` | Plex artist `ratingKey` (matches `artist_spotlight_state.artist_id`) |
| `artistName` | `string` | From Plex `Directory@title` for the artist |
| `albumCount` | `number` | Count of albums by this artist in the active library (must be `> 2` per FR-011) |
| `albumArtUrls` | `string[]` | Up to 3 cover URLs (oldest first) for the stacked visual |

### `AlbumListItem` (returned to client, Browse All)

A lighter-weight variant of `Album` for the alphabetical view to keep the 50 k-album payload manageable.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Plex `ratingKey` |
| `title` | `string` | As-displayed |
| `artist` | `string` | As-displayed |
| `artUrl` | `string \| undefined` | Cover URL (may be omitted; placeholder used) |
| `sortKey` | `string` | Pre-computed lowercase sort key with "The " stripped (FR-024). Allows the client to do incremental filter/jump without recomputing. |

## Entity Relationships

```
plex_connections (existing)              artist_spotlight_state (new)
  ─ active_library_ids[]                   ─ artist_id (PK, opaque Plex ratingKey)
                                           ─ last_spotlighted_at

Plex API (external, not in DB):
  Library Section (libraryId)
    └── Album (ratingKey, addedAt, userRating, lastViewedAt, parentRatingKey → Artist)
          └── Track (ratingKey, parentRatingKey → Album, viewCount, lastViewedAt)
  Artist (ratingKey)
    └── Album[]
```

`artist_spotlight_state.artist_id` references Plex's stable artist `ratingKey` (string). There is no FK in PostgreSQL because Plex IDs are not stored as their own table — they are opaque references to remote Plex resources. The single-user assumption (one active Plex server at a time) makes this acceptable; on server switch, the existing data-wipe service (`backend/src/services/plex/data-wipe-service.ts` from feature 002) should also truncate `artist_spotlight_state`.

## State Transitions

### `artist_spotlight_state` row lifecycle

```
(nonexistent) ──[first time artist selected for Spotlight]──▶ row inserted with last_spotlighted_at = now()
              ◀──[artist eligible but rotation surfaces others]── (unchanged)

row exists ───[artist re-selected for Spotlight]──▶ last_spotlighted_at = now()
            ◀──[artist no longer eligible (lost an album)]── (row remains; harmless)

row exists ───[Plex server switched / library wiped]──▶ row truncated (handled by existing data-wipe-service)
```

The "row remains" state when an artist becomes ineligible is intentional: if the artist later re-becomes eligible (e.g., user re-adds an album), the historical timestamp is still meaningful for the round-robin.

## Validation Rules

| Rule | Where enforced | Notes |
|------|----------------|-------|
| `artist_id` length ≤ 255 chars | DB (text) + Zod schema on inputs | Plex `ratingKey` is typically <12 chars; bounded by `text` column |
| `last_spotlighted_at` is not in the future | Service layer | Always uses server `now()`; defensive validation rejects clock-skew anomalies |
| Selected artists must each have `> 2` albums in current library | `album-groups-service.ts` | Computed at request time from Plex album list |
| Album `userRating` for Hidden Gems must satisfy `>= 6` (0–10 scale) | `album-groups-service.ts` | Equivalent to 3 stars on the 5-star UI scale (Clarification 2026-05-19 Q1) |
| Hidden Gems neglect threshold = 90 days | `album-groups-service.ts` (constant) | Clarification 2026-05-19 Q5 |
| Random Picks is uniform random over the full library | `album-groups-service.ts` | FR-009; reseeded per request (FR-028) |
| Each group capped at 5 items | `album-groups-service.ts` | FR-004 |
| Empty group emitted as `[]` (NOT omitted) | `album-groups-service.ts` | Frontend hides on `length === 0` (FR-003) |

## Indexes

- `artist_spotlight_state` PK on `artist_id` (automatic).
- `idx_artist_spotlight_state_last_shown` on `last_spotlighted_at ASC` to support the round-robin ORDER BY (created in the migration above).

No other indexes are added. The existing `plex_connections` table is unchanged.
