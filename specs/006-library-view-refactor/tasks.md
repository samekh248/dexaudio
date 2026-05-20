---
description: "Task list for feature 006 — Library View Refactor"
---

# Tasks: Library View Refactor

**Input**: Design documents from `/specs/006-library-view-refactor/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md and quickstart.md enumerate Vitest unit/integration targets. Tests for a story are listed before implementation tasks where applicable.

**Organization**: Tasks grouped by user story (US1–US4). P1 stories (US1–US3) form the refactor MVP; US4 confirms no playback regression.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1–US4). Omitted on Setup, Foundational, and Polish tasks.
- Paths are repository-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch and baseline verification before changes.

- [x] T001 Verify branch `007-library-view-refactor` is checked out and `specs/006-library-view-refactor/plan.md` matches active work
- [x] T002 [P] Run `cd backend && npm test` and `cd frontend && npm test` — confirm green baseline from `main`/parent branch
- [x] T003 [P] Run TypeScript check in `backend/`, `frontend/`, and `packages/shared-types/` (`npm run typecheck` or `tsc --noEmit`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, per-group API surface, and selection `limit` support. **No user story work until this phase completes.**

**⚠️ CRITICAL**: US1–US3 all depend on split group endpoints and `AlbumGroupResponse`.

- [x] T004 [P] Add `AlbumGroupResponseSchema` (`items` array) and `LibraryGroupKey` string union (`recently-played` | `recently-added` | `hidden-gems` | `random-picks` | `artist-spotlights`) to `packages/shared-types/src/api/schemas.ts`; export inferred types from `packages/shared-types/src/index.ts`
- [x] T005 Refactor `backend/src/services/plex/album-groups-service.ts` — replace `GROUP_LIMIT = 5` with `HOME_PREVIEW_LIMIT = 10` and `VIEW_ALL_LIMIT = 20`; add `limit` parameter to `selectRecentlyPlayed`, `selectRecentlyAdded`, `selectHiddenGems`, `selectRandomPicks`, and spotlight selection; export per-group functions `getRecentlyPlayed`, `getRecentlyAdded`, `getHiddenGems`, `getRandomPicks`, `getArtistSpotlights` each returning `{ items }`
- [x] T006 [US1] In `getArtistSpotlights` path inside `album-groups-service.ts`, call `markShown` only when `limit <= 10` (read-only selection for view-all per `data-model.md`)
- [x] T007 [P] Register five routes in `backend/src/api/routes/library.ts`: `GET /library/albums/groups/recently-played`, `…/recently-added`, `…/hidden-gems`, `…/random-picks`, `…/artist-spotlights` — Zod-validate `libraryId` and optional `limit` (1–20, default 10); wire to per-group service functions
- [x] T008 Update legacy `GET /library/albums/groups` in `backend/src/api/routes/library.ts` to return up to **10** items per array (deprecation comment in handler); keep response shape `AlbumGroupsResponse`
- [x] T009 [P] Add `getAlbumGroup(libraryId, groupKey, limit?)` to `frontend/src/services/api-client.ts` mapping to the five new endpoints
- [x] T010 [P] Unit tests in `backend/tests/unit/album-groups-service.test.ts` — assert selection returns 10 items when `limit=10` and 20 when `limit=20`; assert `markShown` not called when `limit=20` for artist spotlights
- [x] T011 [P] Integration test `backend/tests/integration/library-album-groups-split.test.ts` — exercise all five routes with mocked Plex data; assert `{ items }` shape and 404 without Plex

**Checkpoint**: Per-group APIs callable via curl per `quickstart.md` §2.

---

## Phase 3: User Story 1 — Progressive per-group loading (Priority: P1) 🎯 MVP

**Goal**: Library home loads each curated group independently in fixed vertical order with row-level loading, auto-retry once, and manual Retry.

**Independent Test**: Open `/` — groups appear in FR-002 order; slow groups show skeleton in their slot only; one failed group shows Retry without breaking others; Network tab shows five parallel requests.

### Tests for User Story 1

- [x] T012 [P] [US1] Component test `frontend/tests/unit/LibraryGroupSection.test.tsx` — renders skeleton when loading; error + Retry when `isError`; hides section when `items.length === 0`; renders children when success
- [x] T013 [P] [US1] Component test `frontend/tests/unit/AlbumsHomePage.groups.test.tsx` — mocks five `useAlbumGroup` queries at different states; asserts fixed section order and no full-page spinner when one group still loading

### Implementation for User Story 1

- [x] T014 [P] [US1] Create `frontend/src/hooks/use-album-group.ts` — TanStack Query per `groupKey` + `libraryId` + `limit` (default 10); `retry: 1`; `queryKey` includes group key; `refetch` exposed for manual Retry
- [x] T015 [US1] Create `frontend/src/components/albums/LibraryGroupSection.tsx` — props: `title`, `groupKey`, `libraryId`, `showViewAll`, `children` render prop `(items) => ReactNode`; fixed min-height skeleton; error row with shadcn `Button` "Retry" calling `refetch()`; return `null` when success and empty
- [x] T016 [US1] Rewrite `frontend/src/pages/AlbumsHomePage.tsx` — remove `useAlbumGroups`; render five `LibraryGroupSection` wrappers in order (Recently Played → … → Artist Spotlights); pass row content via `AlbumGroupRow` + cards (existing components); keep library-level empty state when all groups empty
- [x] T017 [US1] Remove full-page loading gate in `frontend/src/pages/AlbumsHomePage.tsx` — page title renders immediately; only per-row skeletons (FR-001, FR-004a)

**Checkpoint**: US1 independently testable — progressive group loading without waiting for monolithic `/groups`.

---

## Phase 4: User Story 2 — Uniform cards and 10-item carousel (Priority: P1)

**Goal**: All home cards share 160px spotlight footprint; up to 10 items per row (11 for Random Picks with Browse All); non-looping horizontal scroll.

**Independent Test**: Inspect card widths (160px); row with 10+ items scrolls horizontally and stops at ends without looping.

### Tests for User Story 2

- [x] T018 [P] [US2] Update `frontend/tests/unit/AlbumGroupRow.test.tsx` — assert no `slice(0, 5)` behavior; renders all passed entries; carousel container has `overflow-x-auto` and focusable scroll region
- [x] T019 [P] [US2] Component test `frontend/tests/unit/AlbumCard.sizing.test.tsx` — root element width is `160px` (`w-[160px]`)

### Implementation for User Story 2

- [x] T020 [P] [US2] Update `frontend/src/components/albums/AlbumCard.tsx` — set outer width to `w-[160px] shrink-0` (match `ArtistSpotlightTile` footprint per FR-005)
- [x] T021 [P] [US2] Update `frontend/src/components/albums/BrowseAllTile.tsx` — set outer width to `w-[160px] shrink-0` (was 180px)
- [x] T022 [US2] Update `frontend/src/components/albums/AlbumGroupRow.tsx` — remove `entries.slice(0, 5)`; add `overflow-x-auto overscroll-x-contain` carousel wrapper with `role="region"`, `aria-label` including group title, `tabIndex={0}` for keyboard scroll (FR-007, FR-008, FR-018)
- [x] T023 [US2] Update Random Picks section in `frontend/src/pages/AlbumsHomePage.tsx` — pass up to 10 `AlbumCard` entries plus `BrowseAllTile` (11 total per FR-006, FR-017); ensure `useAlbumGroup` uses `limit=10` for random albums only

**Checkpoint**: US2 testable — uniform 160px cards and 10-item non-looping carousels on home rows.

---

## Phase 5: User Story 3 — View all category pages (Priority: P1)

**Goal**: View all links (except Random Picks) open dense-grid pages with up to 20 items using Browse All layout.

**Independent Test**: Click View all under Recently Added → `/library/recently-added` shows ≤20 newest albums in same grid as `/albums/all`; Random Picks has no View all link.

### Tests for User Story 3

- [x] T024 [P] [US3] Component test `frontend/tests/unit/ViewAllLink.test.tsx` — renders link with correct `to` per group key
- [x] T025 [P] [US3] Component test `frontend/tests/unit/CategoryAlbumsPage.test.tsx` — mocked API `limit=20`; renders `AlbumGrid` with correct count and title

### Implementation for User Story 3

- [x] T026 [P] [US3] Create `frontend/src/components/albums/AlbumGrid.tsx` — extract dense grid from `frontend/src/pages/BrowseAllAlbumsPage.tsx` (`grid-cols-2 … lg:grid-cols-6`, `content-visibility: auto`); accept `items` with play overlay + details link (album cards)
- [x] T027 [US3] Refactor `frontend/src/pages/BrowseAllAlbumsPage.tsx` to use `AlbumGrid` from `frontend/src/components/albums/AlbumGrid.tsx`
- [x] T028 [P] [US3] Create `frontend/src/components/albums/ViewAllLink.tsx` — link below row; maps `groupKey` → route (`/library/recently-added`, etc.)
- [x] T029 [P] [US3] Create `frontend/src/pages/CategoryAlbumsPage.tsx` — parameterized by group key + title; `useAlbumGroup(libraryId, key, 20)`; renders heading + `AlbumGrid`; empty → `EmptyState`
- [x] T030 [US3] Create `frontend/src/pages/CategorySpotlightsPage.tsx` — `useAlbumGroup(…, 'artist-spotlights', 20)`; dense grid of `ArtistSpotlightTile` (same breakpoints as `AlbumGrid`)
- [x] T031 [US3] Register routes in `frontend/src/App.tsx`: `/library/recently-added`, `/library/recently-played`, `/library/hidden-gems`, `/library/artist-spotlights`
- [x] T032 [US3] Wire `ViewAllLink` into `frontend/src/components/albums/LibraryGroupSection.tsx` when `showViewAll={true}`; set `showViewAll={false}` for Random Picks in `frontend/src/pages/AlbumsHomePage.tsx` (FR-009)

**Checkpoint**: US3 testable — all View all destinations work; Random Picks excluded.

---

## Phase 6: User Story 4 — Preserve play and navigation (Priority: P2)

**Goal**: No regression in play overlay, details navigation, artist spotlight actions, or Browse All tile after resize and layout refactor.

**Independent Test**: From home and category pages, play → Now Playing; details → album page; spotlight play-all vs artist page unchanged; same-album restart behavior intact.

### Tests for User Story 4

- [x] T033 [P] [US4] Update `frontend/tests/unit/AlbumCard.test.tsx` (or create) — play overlay triggers `usePlayAlbum`; details link navigates to `/albums/:id` without play
- [x] T034 [P] [US4] Update `frontend/tests/unit/ArtistSpotlightTile.test.tsx` — play vs details affordances still independent after 160px alignment

### Implementation for User Story 4

- [x] T035 [US4] Verify `frontend/src/components/albums/PlayAlbumOverlay.tsx` remains fully visible on `w-[160px]` cards in `frontend/src/components/albums/AlbumCard.tsx` — adjust padding/overlay size if clipped
- [x] T036 [US4] Verify `frontend/src/hooks/use-play-album.ts` and `frontend/src/hooks/use-play-artist.ts` wiring from `AlbumGrid`, `AlbumCard`, and `ArtistSpotlightTile` on home + category pages (FR-016)
- [x] T037 [US4] Manual pass: play same album twice from home → restarts at track 1 and navigates to `/now-playing` (FR-016c regression)

**Checkpoint**: US4 complete — listening workflows unchanged from feature 003.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, deprecation, and success-criteria validation.

- [x] T038 [P] Remove or deprecate `frontend/src/hooks/use-album-groups.ts` and monolithic `getAlbumGroups` usage once `AlbumsHomePage` is fully migrated (keep api-client method if legacy route remains)
- [x] T039 [P] Align `specs/006-library-view-refactor/contracts/openapi.yaml` with any final route naming if implementation diverges; add comment in `backend/src/api/routes/library.ts` pointing to contract file
- [x] T040 Run `quickstart.md` manual checklist and automated tests; append "Verification results" subsection to `specs/006-library-view-refactor/quickstart.md` with SC-001–SC-008 notes
- [x] T041 [P] Measure SC-002 (uniform 160px cards) and SC-004 (carousel non-loop) per quickstart; document pass/fail in quickstart verification section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational (T004–T011)
- **US2 (Phase 4)**: Depends on Foundational; integrates with US1 `AlbumsHomePage` / `AlbumGroupRow` (complete US1 first or interleave after T016)
- **US3 (Phase 5)**: Depends on Foundational (API `limit=20`) and US1 `LibraryGroupSection` hook pattern
- **US4 (Phase 6)**: Depends on US2 card sizing and US3 `AlbumGrid` — verification only
- **Polish (Phase 7)**: After US1–US4

### User Story Dependencies

| Story | Depends on | Can start after |
|-------|------------|-----------------|
| US1 | Foundational | T011 |
| US2 | Foundational + US1 page shell | T016 (recommended) |
| US3 | Foundational + US1 `LibraryGroupSection` | T015 |
| US4 | US2 + US3 | T023, T032 |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T004 ∥ T010 ∥ T011; T007 after T005
- **US1**: T012 ∥ T013; T014 ∥ T015 (hook before section)
- **US2**: T020 ∥ T021
- **US3**: T026 ∥ T028 ∥ T029; T030 after T015 pattern
- **US4**: T033 ∥ T034
- **Polish**: T038 ∥ T039 ∥ T041

### Parallel Example: Foundational

```bash
# After T005 lands:
Task T007: Register five group routes in backend/src/api/routes/library.ts
Task T009: Add getAlbumGroup to frontend/src/services/api-client.ts
Task T010: Unit tests for limit and markShown guard
```

### Parallel Example: User Story 3

```bash
Task T026: Extract AlbumGrid.tsx
Task T028: Create ViewAllLink.tsx
Task T029: Create CategoryAlbumsPage.tsx
# Then T027, T031, T032 sequentially
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup
2. Phase 2 Foundational (critical)
3. Phase 3 US1 — progressive loading only (can ship with existing 5-wide cards temporarily)
4. **Validate** per quickstart §3 first bullet

### Incremental Delivery

1. Foundational → per-group APIs
2. US1 → async home
3. US2 → 10-item uniform carousel
4. US3 → View all pages
5. US4 → regression pass
6. Polish → cleanup + SC verification

### Suggested MVP Scope

**US1 + Foundational** delivers the highest-impact change (async loading). **US2 + US3** complete the Linear project scope. **US4** is a required regression gate before merge.

---

## Notes

- Total tasks: **41**
- Per story: Setup 3, Foundational 8, US1 6, US2 6, US3 9, US4 5, Polish 4
- No new npm dependencies (Constitution V)
- No database migrations
- Feature 003 components are refactored in place; do not remove `artist_spotlight_state` behavior
