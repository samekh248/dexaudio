# Implementation Plan: Library View Refactor

**Branch**: `007-library-view-refactor` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-library-view-refactor/spec.md`

## Summary

Refactor the grouped albums library home (`AlbumsHomePage`) to load **five curated groups independently** via parallel REST calls, show **10 preview cards** per row (11 for Random Picks including Browse All), unify all cards to the **160px artist-spotlight footprint**, use **non-looping horizontal carousels**, and add **View all** links (except Random Picks) that open **dense-grid category pages** (same layout as `BrowseAllAlbumsPage`) listing up to **20** items. Fixed vertical group order with per-row loading, auto-retry once, and manual Retry on failure.

Backend: split `album-groups-service` into per-group handlers with shared `getAllAlbumsWithStats` cache; add `limit` query (1–20, default 10). Frontend: five TanStack Query hooks, `LibraryGroupSection` shell, shared `AlbumGrid`, four new category routes.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19.2.x; Node.js 22.x LTS; PostgreSQL 16+ (no new migrations)

**Primary Dependencies**:
- **Frontend**: Vite, React 19, React Router 7, TanStack Query, Zustand (`playback-queue-store`), shadcn/ui (`Card`, `AspectRatio`, `Button`, `Skeleton`) + Tailwind CSS, Vitest + Testing Library
- **Backend**: Fastify, Zod validation, Drizzle ORM, existing Plex services + `artist_spotlight_state`
- **Shared**: `packages/shared-types` — add `AlbumGroupResponse`, `LibraryGroupKey` type; extend API client

**Storage**: No schema changes. Reuse `allAlbumsCache` / `playCount30dCache` in `library-service.ts` (60 s TTL per `libraryId`).

**Testing**: Vitest in `frontend/` and `backend/`; unit tests for `limit` param, selection at 10 vs 20, spotlight `markShown` only when `limit <= 10`; component tests for `LibraryGroupSection`, carousel scroll; integration tests for new group routes.

**Target Platform**: PWA-capable browsers; 320 px–desktop; touch + keyboard carousel (focusable scroll region).

**Project Type**: Web application monorepo (frontend + backend + shared-types)

**Performance Goals**:
- SC-001 / FR-019: first group visible < 2 s (parallel fetch + cache warm)
- SC-004: 10-item carousel scroll without jank
- Per-group handler p95 < 500 ms after cache warm (selection only)

**Constraints**:
- Constitution Principle V: **no new npm dependencies**
- Preserve 003 play/details/Now Playing behavior (FR-016)
- Artist spotlight `markShown` side effect only on home preview requests (`limit <= 10`)
- Deprecate but keep `GET /library/albums/groups` during migration

**Scale/Scope**: Same as 003 — single Plex library; libraries up to ~50k albums (category pages only fetch 20 items)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — no schema change |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — Skeleton, Button, Card composites |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — thin layout composites only |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — five new GET routes |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — Zod schemas + OpenAPI in `contracts/` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — FR-018, focusable carousel regions, Retry labels |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — TanStack Query + existing SW stale-while-revalidate |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — carousel swipe + dense grid breakpoints |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass — N/A |

**Post-design re-check**: All gates remain ✅.

## Project Structure

### Documentation (this feature)

```text
specs/006-library-view-refactor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
├── checklists/requirements.md
└── tasks.md              # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared-types/
└── src/api/schemas.ts              # AlbumGroupResponse, limit schemas

backend/src/
├── api/routes/library.ts           # Five group routes + legacy /groups limit=10
├── services/plex/album-groups-service.ts  # HOME_PREVIEW_LIMIT=10, VIEW_ALL_LIMIT=20, per-group exports
└── tests/
    ├── unit/album-groups-service.test.ts  # limit 10/20, markShown guard
    └── integration/library-album-groups-split.test.ts

frontend/src/
├── App.tsx                         # Routes: /library/recently-added, …/played, …/gems, …/spotlights
├── components/albums/
│   ├── AlbumCard.tsx               # w-[160px] uniform
│   ├── AlbumGroupRow.tsx           # remove slice(5); carousel a11y
│   ├── ArtistSpotlightTile.tsx     # unchanged size (reference)
│   ├── BrowseAllTile.tsx           # w-[160px]
│   ├── AlbumGrid.tsx               # NEW — extracted from BrowseAllAlbumsPage
│   ├── LibraryGroupSection.tsx     # NEW — fixed slot, loading/error/retry/view-all
│   └── ViewAllLink.tsx             # NEW — below-row link
├── hooks/
│   ├── use-album-group.ts          # NEW — per-group TanStack Query (retry:1)
│   └── use-album-groups.ts         # Deprecated after migration
├── pages/
│   ├── AlbumsHomePage.tsx          # Five LibraryGroupSection instances
│   ├── BrowseAllAlbumsPage.tsx     # Uses AlbumGrid
│   └── CategoryAlbumsPage.tsx      # NEW — generic album category (title, groupKey, limit 20)
│   └── CategorySpotlightsPage.tsx  # NEW — artist grid view-all
└── services/api-client.ts          # getAlbumGroup(libraryId, key, limit)

frontend/tests/unit/
├── album-group-row.test.tsx
└── library-group-section.test.tsx
```

**Structure Decision**: Web application layout (Option 2). Refactor in place on 003 components; no new packages.

## Complexity Tracking

> No constitution violations. No new dependencies.

| Item | Justification |
|------|----------------|
| `LibraryGroupSection` | Encapsulates fixed-slot loading/error/retry/view-all per FR-004a/FR-003 |
| `AlbumGrid` | DRY between Browse All and four category pages per clarification D |
| Five API routes vs. one | Required for true per-group async (see research.md §1) |

## Phase 0 & Phase 1 Outputs

- [research.md](./research.md) — API split, grid reuse, carousel, retry, constants
- [data-model.md](./data-model.md) — group keys, limits, UI state machine
- [contracts/openapi.yaml](./contracts/openapi.yaml) — per-group endpoints
- [quickstart.md](./quickstart.md) — run, test, validate

## Implementation Notes (for /speckit-tasks)

1. **Backend first**: Extract `getGroupAlbums(db, config, libraryId, selector, limit)` helper; wire five routes; bump legacy `/groups` to `limit=10`; guard `markShown` when `limit > 10`.
2. **Shared types + api-client**: Add methods before frontend switch.
3. **AlbumGrid extraction**: Refactor `BrowseAllAlbumsPage` before category pages.
4. **Card sizing**: Single pass on `AlbumCard`, `BrowseAllTile` → 160px.
5. **AlbumsHomePage rewrite**: Replace `useAlbumGroups` with five `useAlbumGroup` calls; fixed section order.
6. **Routes**: `/library/recently-added`, `/library/recently-played`, `/library/hidden-gems`, `/library/artist-spotlights`.
7. **Tests**: Update existing `album-groups-service` tests for limit 10; add integration for split routes.
8. **Remove** `useAlbumGroups` usage once home page stable (optional cleanup task).
