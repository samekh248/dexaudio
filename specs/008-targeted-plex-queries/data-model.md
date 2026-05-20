# Data Model: Targeted Library Queries (008-targeted-plex-queries)

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

**None.** Reuses `artist_spotlight_state` and all 003/006 domain types.

## Constants

| Constant | Value | Usage |
|----------|-------|--------|
| `GROUP_FETCH_SIZE` | 20 | Internal fetch size per profile (FR-007) |
| `HOME_PREVIEW_LIMIT` | 10 | Default API `limit`; slice from cached 20 |
| `VIEW_ALL_LIMIT` | 20 | Max API `limit` |
| `FALLBACK_SCAN_CAP` (N) | 500 | Max albums per degraded local scan |
| `RANDOM_POOL_RECENT` (M₁) | 300 | Random Picks recent slice |
| `RANDOM_POOL_ALPHA` (M₂) | 300 | Random Picks alphabetical slice |
| `CACHE_TTL_MS` | 60_000 | Profile result cache |
| `HIDDEN_GEMS_RATING_MIN` | 6 | Unchanged |
| `NEGLECT_MS` | 90 days | Unchanged |

## Entities

### `LibraryQueryProfile` (backend enum)

| Profile | Plex strategy | Fields required | Output selector |
|---------|---------------|-----------------|-----------------|
| `recently-added` | `addedAt:desc` × 20 | id, title, artist, art, addedAt | `selectRecentlyAdded` (pass-through top 20) |
| `recently-played` | playCounts30d + metadata supplement | + playCount30d, lastPlayedAt | `selectRecentlyPlayed` |
| `hidden-gems` | `userRating:desc` × N + filter | + userRating, lastPlayedAt | `selectHiddenGems` |
| `random-picks` | hybrid M₁ + M₂ → shuffle | display fields | `selectRandomPicks` (pool draw) |
| `artist-spotlights` | artists type=8 + per-artist albums | artistId, albums[], art | `buildArtistSpotlights` + DB round-robin |

### `ProfileResultCache` (in-memory)

```ts
{
  key: `${libraryId}:profile:${profileName}`,
  items: AlbumWithStats[] | ArtistSpotlight[],  // always computed for 20 (or fewer if library small)
  expires: number,  // Date.now() + CACHE_TTL_MS
}
```

### `RandomPicksPool` (ephemeral per cache window)

```ts
{
  recentSlice: AlbumWithStats[],   // ≤ M₁
  alphaSlice: AlbumWithStats[],    // ≤ M₂
  union: AlbumWithStats[],         // deduped
  drawn: AlbumWithStats[],         // ≤ 20 after shuffle
}
```

### `DegradedScanState` (per request, not persisted)

When remote sort fails: accumulates ≤N albums across paginated fetches, applies profile selector, returns best-within-N.

## Relationships

```text
Plex Library (libraryId)
  ├── Profile: recently-added ──► Plex sort addedAt:desc (20) ──► cache ──► slice(limit)
  ├── Profile: recently-played ──► playCounts30d + metadata ──► select ──► cache ──► slice(limit)
  ├── Profile: hidden-gems ──► Plex sort userRating:desc (≤500) ──► filter ──► select ──► cache
  ├── Profile: random-picks ──► hybrid pool ──► shuffle ──► cache
  └── Profile: artist-spotlights ──► artists + children ──► spotlight_repo ──► cache

Browse All / legacy /groups
  └── getAllAlbumsWithStats (full catalog) — unchanged, on-demand only
```

## Validation Rules

- HTTP `limit`: 1–20; response `items.length <= limit`.
- Internal fetch always targets 20 when library has ≥20 qualifying entries.
- `markShown` for artist spotlights only when `limit <= 10` (006 rule preserved).
- Cache keys include `libraryId`; library switch clears effective cache via new keys.
- No profile may call `fetchAllAlbums` in the hot path for home groups.

## State Transitions

### Profile cache

| Event | Transition |
|-------|------------|
| Cold request | Miss → Plex fetch → store 20 → return slice(limit) |
| Hit within TTL | Return slice(limit) from cached 20 |
| TTL expired | Miss → refetch |
| In-flight duplicate | Coalesce on cache key |

### Random Picks pool

| Event | Transition |
|-------|------------|
| Cache miss | Build slices → union → shuffle → store 20 |
| Cache hit | Reshuffle optional: **Decision** — same 20 for TTL (stable session); new shuffle on cache miss only (matches “re-entry” freshness) |
