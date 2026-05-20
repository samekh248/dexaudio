# Data Model: Library View Refactor (006-library-view-refactor)

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

**None.** This feature reuses the `artist_spotlight_state` table and all Plex-derived fields from feature 003.

## API & Domain Constants

| Constant | Value | Usage |
|----------|-------|--------|
| `HOME_PREVIEW_LIMIT` | 10 | Default `limit` on per-group home endpoints |
| `VIEW_ALL_LIMIT` | 20 | `limit` on category list pages |
| `HIDDEN_GEMS_RATING_MIN` | 6 | Unchanged (3★ on 10-pt scale) |
| `NEGLECT_MS` | 90 days | Unchanged |

## Entities

### `LibraryGroupKey` (enum, API path segment)

| Key | Home endpoint | View-all route | Item type |
|-----|---------------|----------------|-----------|
| `recently-played` | `/library/albums/groups/recently-played` | `/library/recently-played` | `Album[]` |
| `recently-added` | `/library/albums/groups/recently-added` | `/library/recently-added` | `Album[]` |
| `hidden-gems` | `/library/albums/groups/hidden-gems` | `/library/hidden-gems` | `Album[]` |
| `random-picks` | `/library/albums/groups/random-picks` | — (no view-all) | `Album[]` |
| `artist-spotlights` | `/library/albums/groups/artist-spotlights` | `/library/artist-spotlights` | `ArtistSpotlight[]` |

### `AlbumGroupResponse` (new shared response)

```ts
{ items: Album[] }           // album groups
{ items: ArtistSpotlight[] } // artist-spotlights only
```

Empty qualifying set → `{ items: [] }`; frontend hides the section (no slot).

### `LibraryGroupSectionState` (frontend UI state machine)

| State | UI |
|-------|-----|
| `loading` | Fixed-height skeleton in group slot |
| `success` | Carousel row + View all link (if applicable) |
| `empty` | Section not rendered |
| `error` | Inline message + Retry button |

Transitions: `loading → success | empty | error`; `error → loading` on Retry; auto `loading` once on fetch failure before `error`.

### `LibraryGroupRow` (presentation)

Extends 003 row model: up to **10** preview entries (11 for Random Picks including Browse All tile). Horizontal non-looping scroll. Uniform **160px** card width.

### `CategoryListPage` (presentation)

Up to **20** items in dense grid (same as `BrowseAllAlbumsPage`). Reuses `Album` or `ArtistSpotlight` types—not `AlbumListItem` (full-library optimization not needed at 20 items).

## Relationships (unchanged from 003)

```text
Plex Library (libraryId)
  └── AlbumWithStats[]  ← cached 60s per libraryId
        ├── selectRecentlyPlayed(limit)
        ├── selectRecentlyAdded(limit)
        ├── selectHiddenGems(limit)
        ├── selectRandomPicks(limit)
        └── selectArtistSpotlights(limit) → artist_spotlight_state R/W
```

## Validation Rules

- `limit` query param: integer, default 10, min 1, max 20; values >20 clamped to 20.
- Random Picks: server always returns ≤`limit` albums; client always appends Browse All tile (not in API payload).
- Artist Spotlights home fetch (`limit=10`) still runs round-robin selection + `markShown` side effect; view-all (`limit=20`) uses same selection algorithm with higher cap (no second markShown on same page load—view-all is read-only selection snapshot).

**View-all spotlights note**: View-all page calls the endpoint with `limit=20` without re-running `markShown` if artists were already marked on home load in the same session. Implementation: add `?previewOnly=true` optional flag OR separate `GET` that skips markShown—**Decision**: `markShown` only when `limit <= 10` (home preview); `limit=20` is read-only selection. Document in plan implementation notes.
