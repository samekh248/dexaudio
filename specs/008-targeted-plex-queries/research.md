# Research: Targeted Library Queries (008-targeted-plex-queries)

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All technical unknowns resolved. Clarifications from `/speckit-clarify` (bounded Random Picks, fixed fallback cap N, remote-first equivalence, hybrid pool, fetch-to-20 cache) are reflected below.

---

## 1. Plex album list query shape (remote sort + page size)

**Decision**: Add `fetchAlbumsSorted(config, libraryId, { sort, start, size })` in `plex-client.ts` wrapping:

```http
GET /library/sections/{libraryId}/all?type=9&sort={sort}&X-Plex-Container-Start={start}&X-Plex-Container-Size={size}
```

Supported sort keys for this feature:

| Profile | Sort | Size (remote path) |
|---------|------|-------------------|
| Recently Added | `addedAt:desc` | 20 |
| Recently Played (supplement) | `lastViewedAt:desc` | 50 (tie-break / metadata) |
| Hidden Gems (candidate pull) | `userRating:desc` | min(N, 500) |
| Random Picks slice 1 | `addedAt:desc` | M₁ = 300 |
| Random Picks slice 2 | `titleSort:asc` | M₂ = 300 (3×100 pages) |
| Fallback alphabetical | `titleSort:asc` | pages until N albums |

**Rationale**: Plex album `Directory` elements already expose `addedAt`, `userRating`, `lastViewedAt`, `viewCount` in list responses (003 research). Sorting server-side avoids transferring the full catalog.

**Alternatives considered**:
- Continue `fetchAllAlbums` + in-memory select — **Rejected**: violates FR-001/SC-003.
- GraphQL — **Rejected**: Constitution III (REST only).

---

## 2. Recently Added (lightest path)

**Decision**: Single Plex request: `sort=addedAt:desc`, `size=20`. Map to public albums; no play-count or rating fetch.

**Rationale**: Matches FR-002; satisfies SC-001 first-group target on large libraries (~1 request, ~20 albums).

**Equivalence**: Remote path is globally correct for “newest 20 by added date” when Plex sort is authoritative (SC-004).

---

## 3. Recently Played (30-day play counts + ranking)

**Decision**: Two-step remote-first pipeline (no full album catalog):

1. Reuse `fetchAlbumPlayCounts30d` — already queries only tracks with `viewedAt>=30d` (type=10), aggregates to album keys.
2. Sort the map by count desc, last-played tie-break using album `lastViewedAt` from a **supplemental** fetch:
   - Batch metadata for top ~50 album IDs from the play-count map via `GET /library/metadata/{ratingKey}` (parallel, capped), **or**
   - One `lastViewedAt:desc` page (50 albums) merged with play counts when batch metadata is too heavy.

3. Apply existing `selectRecentlyPlayed(albums, 20)` on the merged set; cache **20 results** per `libraryId:recently-played`.

**Rationale**: Play activity is inherently track-scoped; step 1 is already targeted. Step 2 adds only metadata for candidates with plays.

**Fallback (degraded)**: If play-count query fails, scan at most **N=500** albums via `addedAt:desc` or unpaged chunks with local `viewCount` — return best-within-N per clarification.

---

## 4. Hidden Gems (rating + neglect)

**Decision**: Remote-first:

1. `sort=userRating:desc`, fetch up to **500** albums (N).
2. Server-side filter: `userRating >= 6`, neglect `lastPlayedAt` undefined or &lt; now − 90d.
3. `selectHiddenGems` on filtered set, take 20.

If fewer than 20 qualify after 500, return what qualifies (empty → hide group).

**Rationale**: 003 research noted Plex cannot compose “high rating AND neglected” in one filter; pulling top-rated candidates then filtering locally is standard. Cap N bounds worst case.

**Alternatives considered**:
- Full-catalog scan — **Rejected**: FR-013.
- Plex filter expressions — **Deferred**: not relied on; document in tests if server supports `userRating>=6`.

---

## 5. Artist Spotlights (eligibility without full catalog)

**Decision**: Remote-first artist pass:

1. `GET /library/sections/{libraryId}/all?type=8` paginated until **N=500** artists or exhaustion.
2. For each artist, use Plex `childCount` (if present) or count albums via one `fetchArtistAlbums` only for artists with `childCount > 2` when attribute missing.
3. Build eligibility map; `selectLeastRecentlyShown` + `markShown` when `limit <= 10` (unchanged from 006).
4. For selected artists, `fetchArtistAlbums` for play-all ordering and art URLs (≤3 covers per tile).

**Fallback**: If artist list unavailable, bounded album scan (N=500) and group by `artistId` in-memory (degraded).

**Rationale**: Artists are orders of magnitude fewer than albums; type=8 query is smaller than full album catalog.

---

## 6. Random Picks (hybrid bounded pool)

**Decision**:

- **Slice 1**: `addedAt:desc`, M₁ = **300** albums.
- **Slice 2**: `titleSort:asc`, three pages of 100 → M₂ = **300** albums.
- **Pool** = dedupe by `album.id`, union size ≤ 600.
- **Draw**: Fisher–Yates shuffle pool, take `min(limit, 20)`; cache pool + result set keyed `libraryId:random-picks` for 60s.

**Rationale**: Clarification C — breadth (alphabetical) + freshness (recent). Not equivalent to full shuffle (accepted).

**Re-entry variation**: New shuffle each cache miss; pool slices stable within TTL unless user hard-refreshes.

---

## 7. Fetch-to-20 and cache keys (FR-007 / FR-012)

**Decision**:

| Cache key | Value | TTL |
|-----------|-------|-----|
| `{libraryId}:profile:{name}` | Up to 20 ranked/selected items (full `AlbumWithStats` or public `Album`) | 60s (existing `CACHE_TTL_MS`) |

Handlers always compute **20** internally; HTTP `limit` query slices `items.slice(0, limit)` for response. Home (`limit=10`) and View all (`limit=20`) share the same cache entry.

**Rationale**: Clarification A — avoids duplicate Plex work on View all navigation.

**In-flight dedupe**: Per cache key (not per `libraryId` only), using existing `dedupeInFlight` pattern.

---

## 8. Numeric constants (planning defaults)

| Constant | Value | Notes |
|----------|-------|-------|
| `FALLBACK_SCAN_CAP` (N) | 500 | Per FR-013 / clarification |
| `RANDOM_POOL_RECENT` (M₁) | 300 | Hybrid slice 1 |
| `RANDOM_POOL_ALPHA` (M₂) | 300 | Hybrid slice 2 |
| `GROUP_FETCH_SIZE` | 20 | Always materialize 20 per profile |
| `HIDDEN_GEMS_CANDIDATE_PULL` | 500 | Same as N |
| `CACHE_TTL_MS` | 60_000 | Unchanged |

Tune in implementation if integration tests show insufficient Hidden Gems yield.

---

## 9. API surface and frontend impact

**Decision**: **No REST contract changes.** Response shapes and routes from 006 remain identical. OpenAPI documents behavioral/cache notes only.

**Frontend**: No code changes required for SC goals; optional TanStack Query `staleTime` alignment already 30–60s.

**Rationale**: Spec assumption — optimization is backend-only.

---

## 10. Deprecation path for `getAllAlbumsWithStats`

**Decision**:

- Remove usage from `album-groups-service.ts` group handlers.
- Keep `getAllAlbumsWithStats` for **Browse All** paginated path and legacy `GET /library/albums/groups` until legacy removal.
- Legacy bundled endpoint may still call full catalog (acceptable deprecated cost).

---

## 11. Testing strategy

**Decision**:

- **Unit**: Mock Plex XML for each profile; assert ≤N requests and correct sort params; `limit` 10 vs 20 slicing from cached 20.
- **Integration**: Fixture library — deterministic groups match 003 golden files on remote path; separate fixture forces fallback (mock unsorted Plex) for best-within-N.
- **Random**: Assert pool size bound, variation across two requests after cache expiry, not shuffle equality.

**Baseline comparison (SC-003)**: Log/count album `Directory` elements parsed per cold home load (5 parallel group requests) before/after in integration test.
