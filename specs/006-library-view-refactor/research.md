# Research: Library View Refactor (006-library-view-refactor)

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## 1. Per-group async loading (API shape)

**Decision**: Add five focused REST endpoints under `/api/v1/library/albums/groups/{groupKey}` with a `limit` query parameter (default **10**, max **20**). Deprecate the monolithic `/library/albums/groups` response for the home page; keep it temporarily returning `limit=10` per group for backward compatibility until the frontend migration is complete.

**Rationale**: FR-001 requires groups to render independently. A single aggregated endpoint cannot satisfy progressive UX—the client would still block on the slowest aggregation. Split endpoints let TanStack Query fire five parallel requests; each handler reuses `libraryService.getAllAlbumsWithStats()` which is already cached per `libraryId` (60 s TTL), so parallel calls after the first warm hit are cheap (in-memory selection only). Artist Spotlights retains its DB side effect in its dedicated handler only.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Frontend-only skeleton over one `/groups` call | Does not reduce time-to-first-group; violates FR-001 intent |
| Server-Sent Events / streaming partial JSON | Adds protocol complexity; no existing pattern in codebase |
| Five duplicate full Plex fetches without shared cache | Would multiply Plex load; cache already exists |

## 2. View-all category pages (data + layout)

**Decision**: Reuse the same per-group endpoints with `limit=20` and new frontend routes (`/library/recently-added`, etc.). Extract a shared `AlbumGrid` component from `BrowseAllAlbumsPage` (dense `grid-cols-2 … lg:grid-cols-6`, `content-visibility: auto`) for album categories; artist spotlights use the same grid with `ArtistSpotlightTile`.

**Rationale**: Clarification D requires Browse All styling—not a separate API. `AlbumListItem` from `/albums/all` is optimized for 50k+ libraries; category lists cap at 20 `Album` objects, so the existing group response shape is sufficient.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| New `/library/albums/category/{type}` mega-endpoint | Duplicates group handlers; `limit` param is simpler |
| Vertical carousel for view-all | Contradicts clarification D |

## 3. Uniform card dimensions

**Decision**: Standardize on **160×~200 px** outer footprint (`w-[160px] shrink-0`) matching current `ArtistSpotlightTile`. Update `AlbumCard` (140 px) and `BrowseAllTile` (180 px) to match. Album cover area inside spotlight tile remains stacked visual; album cards keep 1:1 `AspectRatio` cover + title block below.

**Rationale**: FR-005 and SC-002; spotlight tile is the spec's canonical reference size.

## 4. Carousel behavior (non-looping)

**Decision**: Keep native horizontal `overflow-x-auto` on the row container with `overscroll-behavior-x: contain` and `scroll-snap-type: x proximity` (optional snap on cards). No arrow buttons in v1—keyboard users scroll the focused region with arrow keys via roving tabindex on the scroll container (`tabIndex={0}`).

**Rationale**: Meets FR-007/FR-008 without new dependencies. Spec defers arrow UI to planning; native scroll is WCAG-friendly when the region is focusable and labeled.

## 5. Row failure recovery

**Decision**: TanStack Query `retry: 1` per group query (auto-retry) plus row-level `refetch()` on a shadcn `Button` labeled "Retry" (manual). Error copy: "Couldn't load [group name]".

**Rationale**: Matches clarification D (auto once + manual). Isolated `queryKey` per group prevents one failure from invalidating others.

## 6. Fixed slot layout while loading

**Decision**: `AlbumsHomePage` always renders five `LibraryGroupSection` wrappers in canonical order. Each section states: `loading` → skeleton (~160px tall carousel strip), `error` → message + Retry, `empty` → `null` (collapse, no slot), `success` → `AlbumGroupRow` + optional View all link.

**Rationale**: FR-004a; prevents layout shift from fastest-first rendering.

## 7. Constants migration

**Decision**: Replace `GROUP_LIMIT = 5` with `HOME_PREVIEW_LIMIT = 10` and `VIEW_ALL_LIMIT = 20` in `album-groups-service.ts`. Selection functions accept `limit` parameter.

**Rationale**: Single source of truth for backend caps; tests updated accordingly.
