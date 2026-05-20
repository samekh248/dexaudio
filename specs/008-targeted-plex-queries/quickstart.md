# Quickstart: Targeted Library Queries (008)

**Branch**: `008-targeted-plex-queries`

## Prerequisites

- Plex connected with a music library (`libraryId`)
- Feature **006** per-group routes deployed
- Backend dev server running

## Verify targeted fetch (dev)

1. Start backend with logging enabled for Plex HTTP (optional temporary log in `plex-client`).
2. Open library home with a large library (5k+ albums).
3. **Expect**: Network shows five parallel group requests; **no** multi-page `type=9` full-catalog pagination (500× pages) on cold load.
4. **Recently Added** should complete in one Plex page (`sort=addedAt:desc`, size≤20).

## Run tests

```bash
cd backend && npm test -- album-groups-service
cd backend && npm test -- targeted-library
cd frontend && npm test
```

Add `targeted-library` integration tests when implementing.

## Manual checks

| Check | Pass criteria |
|-------|----------------|
| First group visible | Recently Added row &lt; 3s on large library |
| View all reuse | Open Recently Added View all within 60s — no second full Plex sweep |
| Random Picks | Different albums after cache TTL or hard refresh |
| Browse All | `/albums/all` still paginates; home load unchanged |
| Deterministic order | Recently Added order matches Plex “Date Added” for top 20 |

## Key files (implementation)

```text
backend/src/services/plex/plex-client.ts          # fetchAlbumsSorted, batch metadata
backend/src/services/plex/targeted-library-service.ts  # NEW — profiles + cache
backend/src/services/plex/album-groups-service.ts # use profiles, drop loadAlbumsWithPlayCounts
backend/src/services/plex/library-service.ts      # keep getAllAlbums for browse only
backend/tests/unit/targeted-library-service.test.ts
backend/tests/integration/library-targeted-groups.test.ts
```

## Constants (from research)

- N = 500, M₁ = M₂ = 300, cache TTL = 60s, internal fetch size = 20
