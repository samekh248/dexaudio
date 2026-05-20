# Implementation Plan: Albums Library View

**Branch**: `003-albums-library-view` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-albums-library-view/spec.md`

## Summary

Replace the existing flat albums page with a **grouped, curated albums "home"** that displays up to five horizontally-scrolling rows: **Recently Played** (top-5 by play count in trailing 30 days), **Recently Added** (top-5 newest), **Hidden Gems** (top-5 highly-rated ≥3★ albums neglected for ≥3 months), **Random Picks** (5 albums + a larger "Browse All Albums" tile), and **Artist Spotlights** (5 multi-album artists chosen by least-recently-shown round-robin). Each card shows prominent cover art with a hover/focus translucent play button; clicking the play button starts the album and **switches the view to Now Playing**, while clicking the title/artist/cover-body opens the album detail page. The "Browse All Albums" tile opens a virtualized A–Z view of the entire library with a "The"-aware sort rule. Empty groups are hidden.

The grouped view becomes the canonical `/` (root) route, replacing `AlbumGridPage`. The flat A–Z list is reached only via the Browse All tile. Server-side aggregation provides a single `/api/v1/library/albums/groups` endpoint that returns all five groups in one round-trip, plus a new `/api/v1/library/albums/all` for the alphabetical view. Artist round-robin state is persisted in a new `artist_spotlight_state` Postgres table.

## Technical Context

**Language/Version**: TypeScript 5.x strict on both tiers; React 19.2.x (latest stable); Node.js 22.x LTS; PostgreSQL 16+

**Primary Dependencies**:
- **Frontend**: Vite, React 19, React Router (existing routes adjusted), TanStack Query (cache groups data), Zustand (existing `playback-queue-store`), shadcn/ui (`Card`, `AspectRatio`, `Button`, `Skeleton`) + Tailwind CSS, Vitest + Testing Library
- **Backend**: Fastify, Zod validation, Drizzle ORM + `drizzle-kit`, `pg`, Vitest + supertest
- **Shared**: `packages/shared-types` — new Zod schemas (`AlbumGroupsResponse`, `ArtistSpotlight`, `AlbumListItem`)

**Storage**:
- **PostgreSQL**: One new table `artist_spotlight_state(artist_id text PK, last_spotlighted_at timestamptz)`; no other schema changes
- No new caching layer — reuse existing in-memory `albumCache` pattern from `library-service.ts` with short TTL (60 s) for groups; reuse existing browser TanStack Query cache

**Testing**: Vitest in `frontend/` and `backend/`; 80% coverage target maintained; unit tests for sort/grouping logic, round-robin selection, and "The"-aware sort; component tests for `AlbumCard`, `AlbumGroupRow`, `BrowseAllPage`; integration test for `/library/albums/groups` and `/library/albums/all`

**Target Platform**: Modern Chromium/Firefox/Safari desktop browsers; installable PWA; responsive 320 px → desktop; touch-friendly (FR-019)

**Project Type**: Web application (frontend + backend + shared-types monorepo) — same layout as `001`/`002`

**Performance Goals**:
- SC-003 — albums view first meaningful paint < 2 s on ~1,000-album library
- SC-004 — Browse All renders first screen < 2 s, sustained 60 fps scroll on ≥10,000 albums (FR-027)
- FR-006/007/008 server-side aggregation kept under 500 ms p95 for the groups endpoint on a typical library

**Constraints**:
- No new browser-storage of secrets; Plex token continues to live server-side only
- "The"-aware sort applies only to the literal English article "The " (FR-024/025)
- Round-robin state MUST persist across sessions so rotation works after page refresh
- Random Picks selection MUST be stable for a single view session and refresh on re-entry (FR-028)
- Constitution Principle V: NO new npm dependencies — use existing primitives only

**Scale/Scope**: Single operator; one Plex library at a time; libraries up to 50 k albums must render the Browse All view without UI stutter

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass — React 19.2.x, TS strict (existing) |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — Node 22 LTS (existing) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — one new Postgres table, no other stores |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — `Card`, `AspectRatio`, `Button`, `Skeleton` from shadcn/ui; `Link` from React Router |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — `AlbumCard`, `AlbumGroupRow`, `ArtistSpotlightTile`, `BrowseAllTile` are thin composites of shadcn primitives; documented below |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — 2 new REST endpoints under `/api/v1/library/albums/*` |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — Zod schemas in `packages/shared-types` for `AlbumGroupsResponse`, `ArtistSpotlight`, `AlbumListItem` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — FR-018/033/034 explicitly enforce keyboard reachability, accessible names, focus indicators, heading markup |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — groups response cached via SW (`stale-while-revalidate`); previously-cached album art and pinned tracks remain playable offline |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — grid density adapts (1–2 cards visible on 320 px, more on larger); group ordering identical at all breakpoints |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass — zero new npm dependencies; reuses Drizzle, Zod, TanStack Query, Zustand, shadcn/ui already in tree |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass — nothing to document |

**Post-design re-check** (after Phase 1): All gates remain ✅. No constitution violations introduced by the data model, REST contract, or UI composition.

## Project Structure

### Documentation (this feature)

```text
specs/003-albums-library-view/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 — OpenAPI for new endpoints
│   └── openapi.yaml
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/
└── shared-types/
    └── src/api/schemas.ts          # Modified — add AlbumGroupsResponse, ArtistSpotlight, AlbumListItem

backend/
├── drizzle/
│   └── 0009_add_artist_spotlight_state.sql   # New migration
├── src/
│   ├── api/routes/
│   │   └── library.ts              # Modified — add /albums/groups, /albums/all
│   ├── services/plex/
│   │   ├── album-groups-service.ts # New — aggregate the five curated groups
│   │   ├── album-list-service.ts   # New — full alphabetical list with "The"-aware sort
│   │   ├── artist-spotlight-repo.ts# New — round-robin state read/write
│   │   ├── library-service.ts      # Modified — extend with addedAt/userRating/lastViewedAt parsing
│   │   └── plex-client.ts          # Modified — extend parseAlbumFromMetadata to include addedAt, userRating, lastViewedAt
│   └── db/
│       └── schema.ts               # Modified — add artistSpotlightState table
└── tests/
    ├── unit/
    │   ├── album-groups-service.test.ts     # New — group selection rules
    │   ├── album-sort-the-article.test.ts   # New — "The"-aware sort
    │   └── artist-spotlight-repo.test.ts    # New — least-recently-shown rotation
    └── integration/
        ├── library-albums-groups.test.ts    # New — endpoint
        └── library-albums-all.test.ts       # New — endpoint

frontend/
├── src/
│   ├── App.tsx                              # Modified — route changes (see below)
│   ├── components/albums/
│   │   ├── AlbumCard.tsx                    # New — cover + hover play overlay + details link
│   │   ├── AlbumGroupRow.tsx                # New — horizontal row of cards with group heading
│   │   ├── ArtistSpotlightTile.tsx          # New — stacked-album visual + play / open-artist actions
│   │   ├── BrowseAllTile.tsx                # New — larger tile inside Random Picks
│   │   └── PlayAlbumOverlay.tsx             # New — translucent play button overlay (focusable)
│   ├── pages/
│   │   ├── AlbumsHomePage.tsx               # New — the grouped landing view (mounted at /)
│   │   ├── BrowseAllAlbumsPage.tsx          # New — virtualized A–Z view (mounted at /albums/all)
│   │   └── AlbumGridPage.tsx                # Removed — superseded by AlbumsHomePage + BrowseAllAlbumsPage
│   ├── hooks/
│   │   └── use-play-album.ts                # New — fetch tracks, replace queue, navigate to /now-playing
│   ├── lib/
│   │   └── album-sort.ts                    # New — "The"-aware sort comparator (shared with backend tests for parity)
│   └── services/
│       └── api-client.ts                    # Modified — getAlbumGroups, getAllAlbums
└── tests/
    └── unit/
        ├── AlbumCard.test.tsx               # New — play overlay vs details
        ├── AlbumGroupRow.test.tsx           # New — empty group hidden, ≤5 entries
        ├── album-sort-the-article.test.ts   # New — frontend parity test
        └── use-play-album.test.tsx          # New — queue replace + navigate
```

**Structure Decision**: Extends the existing **web-app monorepo** layout. All new code lives under existing top-level folders (`backend/src/services/plex/`, `frontend/src/components/albums/`, `frontend/src/pages/`). Routing changes are scoped to `App.tsx` only; the old `AlbumGridPage.tsx` is deleted (per `FR-001a`/`FR-001b`). The legacy `/api/v1/library/albums?libraryId=…&page=…&pageSize=…` endpoint remains in place to back the new Browse All page in a paginated/virtualized manner; `/api/v1/library/albums/all` is a new server-side-sorted endpoint used by Browse All when full ordering is required.

## Complexity Tracking

No constitution violations. No new dependencies. The four new components (`AlbumCard`, `AlbumGroupRow`, `ArtistSpotlightTile`, `BrowseAllTile`) are thin composites over shadcn/ui primitives (`Card`, `AspectRatio`, `Button`) — they exist only to encapsulate the project-specific layout/interaction (hover overlay, stacked covers, group heading semantics).

| Violation / exception | Why Needed | Simpler Alternative Rejected Because |
|----------------------|------------|--------------------------------------|
| *(none)* | — | — |

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | ✅ Complete |
| Data model | [data-model.md](./data-model.md) | ✅ Complete |
| REST contract | [contracts/openapi.yaml](./contracts/openapi.yaml) | ✅ Complete |
| Quickstart | [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Phases (high level — detail in tasks.md)

### Phase 2+ (out of scope for `/speckit-plan`)

1. **Database migration**: `0009_add_artist_spotlight_state.sql` creates `artist_spotlight_state(artist_id, last_spotlighted_at)`; update Drizzle schema.
2. **Plex client extension**: Extend `parseAlbumFromMetadata` to capture `addedAt`, `userRating`, `lastViewedAt`; add an `albumKey`/sort title helper.
3. **Backend services**: `album-groups-service.ts` aggregates the five groups; `album-list-service.ts` returns the full sorted list; `artist-spotlight-repo.ts` handles round-robin reads/writes.
4. **Backend routes**: `GET /api/v1/library/albums/groups` and `GET /api/v1/library/albums/all?libraryId=…`.
5. **Shared types**: Zod schemas for `AlbumGroupsResponse`, `ArtistSpotlight`, `AlbumListItem`.
6. **Frontend page swap**: New `AlbumsHomePage` and `BrowseAllAlbumsPage`; remove `AlbumGridPage`; update `App.tsx` routes (root `/` → `AlbumsHomePage`, new `/albums/all` → `BrowseAllAlbumsPage`).
7. **Frontend components**: `AlbumCard` (hover/focus play overlay + details link), `AlbumGroupRow`, `ArtistSpotlightTile`, `BrowseAllTile`, `PlayAlbumOverlay`.
8. **Frontend playback wiring**: `use-play-album` hook fetches tracks, calls `playNow`, and navigates to `/now-playing` (`FR-016`/`FR-016a`/`FR-016c`).
9. **Browse All virtualization**: Use a windowed list (e.g., CSS `content-visibility` + manual chunking — no new dependency) sized for 10 k+ albums (FR-027).
10. **Tests**: Backend unit tests for grouping/sorting/rotation; frontend component tests for hover-vs-details distinction, empty-group hiding, restart-same-album behavior, "The"-aware sort parity.
11. **Cleanup**: Delete `AlbumGridPage.tsx`; deep-link redirect from any legacy `/albums` route to `/` (FR-001b).

**Next command**: `/speckit-tasks` to generate the dependency-ordered `tasks.md`.
