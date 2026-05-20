---
description: "Task list for feature 008 — Targeted Library Queries"
---

# Tasks: Targeted Library Queries

**Input**: Design documents from `/specs/008-targeted-plex-queries/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md and quickstart.md require Vitest unit/integration coverage for profiles, equivalence, and SC-003 payload reduction.

**Organization**: Tasks grouped by user story (US1–US3). Backend-only; no frontend changes. P1 stories (US1–US2) form the MVP; US3 verifies Browse All isolation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1–US3). Omitted on Setup, Foundational, and Polish tasks.
- Paths are repository-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch verification and test scaffolding before Plex client changes.

- [x] T001 Verify branch `008-targeted-plex-queries` is checked out and `specs/008-targeted-plex-queries/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [x] T002 [P] Run `cd backend && npm test` — confirm green baseline before targeted-library changes
- [x] T003 [P] Create `backend/tests/unit/targeted-library-service.test.ts` and `backend/tests/integration/library-targeted-groups.test.ts` empty describe blocks with imports wired

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Plex client primitives, profile cache layer, and bounded fallback scanner. **No user story work until this phase completes.**

**⚠️ CRITICAL**: US1–US2 depend on `targeted-library-service.ts` and extended `plex-client.ts`.

- [x] T004 Add `fetchAlbumsSorted(config, libraryId, { sort, start, size })` to `backend/src/services/plex/plex-client.ts` — `type=9`, parse via existing `parseAlbumPageXml`
- [x] T005 [P] Add `fetchArtistsPage(config, libraryId, { start, size })` to `backend/src/services/plex/plex-client.ts` — `type=8`, parse artist `Directory` attrs including `childCount` when present
- [x] T006 [P] Add `fetchAlbumMetadataBatch(config, ratingKeys: string[])` to `backend/src/services/plex/plex-client.ts` — parallel `GET /library/metadata/{id}` capped (e.g. 50 keys)
- [x] T007 Create `backend/src/services/plex/targeted-library-service.ts` — export constants `GROUP_FETCH_SIZE=20`, `FALLBACK_SCAN_CAP=500`, `RANDOM_POOL_RECENT=300`, `RANDOM_POOL_ALPHA=300`, `CACHE_TTL_MS=60000`; implement `profileCacheKey(libraryId, profile)`, in-flight dedupe (reuse pattern from `library-service.ts`), `sliceItems(items, limit)`, internal always materialize 20
- [x] T008 Implement `scanAlbumsBounded(config, libraryId, maxN)` in `backend/src/services/plex/targeted-library-service.ts` — paginate `fetchAlbums` or sorted fetch until `maxN` albums; used for degraded mode only
- [x] T009 [P] Unit tests for `fetchAlbumsSorted` query string (`sort`, `X-Plex-Container-Size`) in `backend/tests/unit/plex-client.test.ts` or new `backend/tests/unit/plex-client-sorted.test.ts`

**Checkpoint**: Plex sorted fetch and cache shell callable from tests with mocked XML.

---

## Phase 3: User Story 1 — Library home without full-catalog gate (Priority: P1) 🎯 MVP

**Goal**: Per-group handlers no longer call `getAllAlbumsWithStats`; at least Recently Added loads via one targeted Plex request; five parallel home requests do not trigger full-catalog pagination.

**Independent Test**: Open library home against a large library — Network/backend logs show no multi-page full `type=9` catalog sweep on cold load; Recently Added row appears before any 500×page catalog loop would finish.

### Tests for User Story 1

- [x] T010 [P] [US1] Integration test in `backend/tests/integration/library-targeted-groups.test.ts` — mock/stub Plex client; assert five group handlers do not call `fetchAllAlbums` on cold parallel load
- [x] T011 [P] [US1] Unit test in `backend/tests/unit/targeted-library-service.test.ts` — `recently-added` profile issues exactly one `fetchAlbumsSorted` with `sort=addedAt:desc` and `size=20`

### Implementation for User Story 1

- [x] T012 [US1] Implement `loadRecentlyAddedProfile(config, libraryId)` in `backend/src/services/plex/targeted-library-service.ts` — remote `addedAt:desc` × 20; cache full 20; return `sliceItems(..., limit)`
- [x] T013 [US1] Refactor `getRecentlyAdded` in `backend/src/services/plex/album-groups-service.ts` — call `loadRecentlyAddedProfile` instead of `loadAlbumsWithPlayCounts` + `selectRecentlyAdded`
- [x] T014 [US1] Remove `loadAlbumsWithPlayCounts` usage from `getRecentlyPlayed`, `getHiddenGems`, `getRandomPicks`, and `getArtistSpotlights` in `backend/src/services/plex/album-groups-service.ts` — temporary delegation to targeted stubs that throw or return `[]` until US2 completes (or implement thin pass-through if US2 done in same sprint)
- [x] T015 [US1] Export `getProfileAlbums(profile, config, libraryId, limit)` facade from `backend/src/services/plex/targeted-library-service.ts` for album-group handlers

**Checkpoint**: Recently Added endpoint works without full catalog; integration test T010 passes for catalog-gate assertion.

---

## Phase 4: User Story 2 — Per-group targeted metadata profiles (Priority: P1)

**Goal**: Each curated group uses only the metadata and Plex queries its selection rules require; fetch-to-20 cache shared by `limit` 10 and 20.

**Independent Test**: For each group endpoint, inspect Plex calls — Recently Played uses 30d track query + bounded metadata; Hidden Gems uses `userRating:desc` pull ≤500; Random uses hybrid M₁+M₂ pool; Spotlights use artist query; home `limit=10` and View all `limit=20` hit same cache key within 60s.

### Tests for User Story 2

- [x] T016 [P] [US2] Unit tests in `backend/tests/unit/targeted-library-service.test.ts` — `recently-played` merges `fetchAlbumPlayCounts30d` with supplemental metadata; ranking matches `selectRecentlyPlayed`
- [x] T017 [P] [US2] Unit tests in `backend/tests/unit/targeted-library-service.test.ts` — `hidden-gems` filters `userRating>=6` and 90d neglect; returns ≤20; scan stops at N=500
- [x] T018 [P] [US2] Unit tests in `backend/tests/unit/targeted-library-service.test.ts` — `random-picks` builds pool ≤600, uniform draw, stable within TTL, differs after cache expiry
- [x] T019 [P] [US2] Unit tests in `backend/tests/unit/targeted-library-service.test.ts` — `artist-spotlights` uses artist eligibility; `markShown` only when `limit<=10` (delegate to existing `album-groups-service` guard)
- [x] T020 [US2] Golden equivalence tests in `backend/tests/unit/targeted-library-service.test.ts` — deterministic groups match `backend/tests/unit/album-groups-service.test.ts` fixture outputs on remote-success mocks (SC-004)
- [x] T021 [P] [US2] Degraded-mode tests in `backend/tests/unit/targeted-library-service.test.ts` — when sorted fetch fails, returns best-within-N not full-catalog equivalent

### Implementation for User Story 2

- [x] T022 [P] [US2] Implement `loadRecentlyPlayedProfile` in `backend/src/services/plex/targeted-library-service.ts` per `research.md` §3
- [x] T023 [P] [US2] Implement `loadHiddenGemsProfile` in `backend/src/services/plex/targeted-library-service.ts` per `research.md` §4
- [x] T024 [P] [US2] Implement `loadRandomPicksProfile` in `backend/src/services/plex/targeted-library-service.ts` — hybrid M₁ recent + M₂ alphabetical slices, dedupe, shuffle, cache 20
- [x] T025 [US2] Implement `loadArtistSpotlightsProfile` in `backend/src/services/plex/targeted-library-service.ts` — artist type=8 pass + `fetchArtistAlbums` for selected artists; integrate `artist-spotlight-repo.ts`
- [x] T026 [US2] Wire `getRecentlyPlayed`, `getHiddenGems`, `getRandomPicks`, `getArtistSpotlights` in `backend/src/services/plex/album-groups-service.ts` to profile loaders; delete `loadAlbumsWithPlayCounts` if unused
- [x] T027 [US2] Ensure `getProfileAlbums` always caches 20 items and `sliceItems` respects `clampGroupLimit(limit)` in `backend/src/services/plex/album-groups-service.ts`

**Checkpoint**: All five group routes pass unit tests; deterministic groups match golden fixtures on remote path.

---

## Phase 5: User Story 3 — Browse All remains on-demand (Priority: P2)

**Goal**: Full catalog load is only used for Browse All / legacy paths, not library home groups.

**Independent Test**: Open Browse All — paginated `getAlbums` still works; open home then Browse All then back — groups do not force new full-catalog fetch within cache TTL.

### Tests for User Story 3

- [x] T028 [US3] Integration test in `backend/tests/integration/library-targeted-groups.test.ts` — `GET /library/albums` paginated path still calls `fetchAlbums` not group profiles; Browse All behavior unchanged
- [x] T029 [US3] Integration test in `backend/tests/integration/library-targeted-groups.test.ts` — legacy `GET /library/albums/groups` may still use full catalog (documented); per-group routes do not

### Implementation for User Story 3

- [x] T030 [US3] Audit `backend/src/api/routes/library.ts` — confirm `getAllAlbumsWithStats` / `fetchAllAlbums` only referenced from browse-all and deprecated bundled `/groups` handlers
- [x] T031 [US3] Add code comment in `backend/src/services/plex/library-service.ts` above `getAllAlbumsWithStats` — "Browse All and legacy /groups only; not used by per-group home endpoints"

**Checkpoint**: US3 verified — home groups and browse paths are isolated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: SC-003 validation, regression tests, legacy cleanup, quickstart.

- [x] T032 [P] Update `backend/tests/unit/album-groups-service.test.ts` — mock `targeted-library-service` instead of full album list fixtures
- [x] T033 Integration test SC-003 in `backend/tests/integration/library-targeted-groups.test.ts` — count parsed album Directory elements on cold 5-request home load; assert ≥50% reduction vs baseline helper
- [x] T034 [P] Optional: refactor deprecated `getAlbumGroups` in `backend/src/services/plex/album-groups-service.ts` to compose five profile loaders (no `getAllAlbumsWithStats`)
- [x] T035 Run `cd backend && npm test` — full backend suite green
- [x] T036 Validate manual checks in `specs/008-targeted-plex-queries/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — MVP deliverable (Recently Added + no full-catalog gate)
- **US2 (Phase 4)**: Depends on Foundational; extends US1 wiring for remaining profiles
- **US3 (Phase 5)**: Depends on US2 completion (or parallel audit once US1 proves no catalog in group routes)
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

| Story | Depends on | Delivers |
|-------|------------|----------|
| US1 (P1) | Phase 2 | No full-catalog gate; Recently Added targeted |
| US2 (P1) | Phase 2, US1 wiring pattern | All five profiles + equivalence tests |
| US3 (P2) | US2 | Browse/legacy path isolation verified |

### Within Each User Story

- Tests listed before implementation (write failing tests first where practical)
- `plex-client` extensions before `targeted-library-service` profiles
- Profile loaders before `album-groups-service` wiring

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T009 after T004
- **Phase 3**: T010 ∥ T011; T012 blocks T013
- **Phase 4**: T022 ∥ T023 ∥ T024 (different profile functions); T016–T021 tests parallelizable once stubs exist
- **Phase 6**: T032 ∥ T034

---

## Parallel Example: User Story 2

```bash
# Profile implementations in parallel (different functions, same file — coordinate merges):
T022: loadRecentlyPlayedProfile in targeted-library-service.ts
T023: loadHiddenGemsProfile in targeted-library-service.ts
T024: loadRandomPicksProfile in targeted-library-service.ts

# Unit tests in parallel after profiles exist:
T016, T017, T018, T019 in backend/tests/unit/targeted-library-service.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T004–T009)
3. Complete Phase 3: US1 (T010–T015)
4. **STOP and VALIDATE**: Integration test proves no `fetchAllAlbums` on home load; Recently Added <3s on large library
5. Demo progressive home with one optimized group

### Incremental Delivery

1. Setup + Foundational → Plex primitives ready
2. US1 → Recently Added targeted + catalog-gate test (MVP)
3. US2 → Remaining four profiles + golden tests
4. US3 → Browse path audit
5. Polish → SC-003 integration + quickstart

### Parallel Team Strategy

- Developer A: Phase 2 `plex-client` (T004–T006)
- Developer B: Phase 2 cache shell (T007–T008)
- After checkpoint: Developer A US1, Developer B US2 profiles T022–T024

---

## Notes

- No frontend tasks — API response shapes unchanged per `contracts/openapi.yaml`
- No new npm packages (Constitution V)
- `limit` query param behavior unchanged; cache always stores 20 per profile
- Degraded fallback: best-within-N=500, not SC-004 equivalent
