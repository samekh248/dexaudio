---

description: "Task list for feature 003 — Albums Library View"
---

# Tasks: Albums Library View

**Input**: Design documents from `/specs/003-albums-library-view/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: Included — the plan and quickstart explicitly enumerate unit and integration test files for this feature (Vitest, 80% coverage target). Tests for a given user story are listed before the implementation tasks for that story.

**Organization**: Tasks are grouped by user story so each can be implemented, validated, and shipped independently. P1 stories (US1, US2, US3) together form the MVP "browse + play + open details" loop.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5). No label on Setup, Foundational, or Polish tasks.
- All paths are repository-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pre-flight checks before any implementation lands. The existing monorepo (`backend/`, `frontend/`, `packages/shared-types/`) already provides toolchain, linting, and test runner, so this phase is intentionally light.

- [x] T001 Verify the working tree is clean and create / check out branch `003-albums-library-view` (already exists per plan)
- [x] T002 [P] Confirm `backend` Vitest config and `frontend` Vitest config both run green from `main` before any new code is added (`cd backend && npm test`; `cd frontend && npm test`)
- [x] T003 [P] Confirm `npm run typecheck` (or `tsc --noEmit`) is green in `backend/`, `frontend/`, and `packages/shared-types/` so we have a clean starting baseline

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, shared types, and Plex parsing changes that every user story depends on. **No user story work may begin until this phase is complete.**

**⚠️ CRITICAL**: All five user stories consume the enriched `Album` shape (addedAt/userRating) and/or the new shared schemas. US1 additionally requires the `artist_spotlight_state` table.

- [x] T004 Create Drizzle migration `backend/drizzle/0009_add_artist_spotlight_state.sql` that creates `artist_spotlight_state(artist_id text PK, last_spotlighted_at timestamptz NOT NULL)` and `idx_artist_spotlight_state_last_shown` per `data-model.md`
- [x] T005 Add `artistSpotlightState` table definition to `backend/src/db/schema.ts` (Drizzle `pgTable` with `artistId` PK and `lastSpotlightedAt` timestamptz NOT NULL) and export it from the schema barrel
- [x] T006 [P] Extend `Album` Zod schema in `packages/shared-types/src/api/schemas.ts` with optional `userRating` (int 0–10) and `addedAt` (ISO date-time string); keep all existing fields backward compatible
- [x] T007 [P] Add `ArtistSpotlightSchema` (`artistId`, `artistName`, `albumCount` ≥3, `albumArtUrls` ≤3) to `packages/shared-types/src/api/schemas.ts` and export the inferred `ArtistSpotlight` type
- [x] T008 [P] Add `AlbumGroupsResponseSchema` (`recentlyPlayed`, `recentlyAdded`, `hiddenGems`, `randomPicks` arrays of `Album` max 5; `artistSpotlights` array of `ArtistSpotlight` max 5) to `packages/shared-types/src/api/schemas.ts` and export `AlbumGroupsResponse`
- [x] T009 [P] Add `AlbumListItemSchema` (`id`, `title`, `artist`, optional `artUrl`, `sortKey`) and an `AllAlbumsResponseSchema` (`items: AlbumListItem[]`, `total: number`) to `packages/shared-types/src/api/schemas.ts`; export inferred types
- [x] T010 Re-export the new schemas/types from `packages/shared-types/src/index.ts` so both `backend/` and `frontend/` can import them
- [x] T011 Extend `parseAlbumFromMetadata` in `backend/src/services/plex/plex-client.ts` to also capture `addedAt` (Plex `Directory@addedAt`, unix seconds → `Date`), `userRating` (`Directory@userRating`, 0–10), and `lastViewedAt` (`Directory@lastViewedAt`, unix seconds → `Date`). Surface these on an internal `AlbumWithStats` shape and on the public `Album` (only `addedAt`/`userRating`); do NOT leak `lastPlayedAt` to clients.
- [x] T012 [P] Add `sortKeyForTitle(title: string): string` helper to a new file `frontend/src/lib/album-sort.ts` per `research.md` §3 — strips a leading `"The "` (case-insensitive, requires trailing space + non-space char) and returns `toLocaleLowerCase()` of the remainder
- [x] T013 [P] Add the equivalent server-side `sortKeyForTitle` helper to a new file `backend/src/services/plex/album-sort.ts` (same logic; kept duplicated for tier independence per Principle V — no shared-types runtime helpers)

**Checkpoint**: Foundation complete — every user story can now proceed.

---

## Phase 3: User Story 1 — Browse curated album groups (Priority: P1) 🎯 MVP

**Goal**: A user lands on `/` and sees up to five labeled, non-empty groups (Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights) with up to 5 cards each. Empty groups vanish entirely.

**Independent Test**: With a populated Plex library, `GET /api/v1/library/albums/groups?libraryId=…` returns the correctly-filtered five arrays; `AlbumsHomePage` renders only the non-empty groups in the documented order; an artist with 3+ albums appears once and is rotated on subsequent visits.

### Tests for User Story 1

- [x] T014 [P] [US1] Unit tests for group selection rules in `backend/tests/unit/album-groups-service.test.ts` — covers: Recently Played top-5 by 30-day play count (tie-break by recency); Recently Added top-5 by `addedAt` desc; Hidden Gems filter (`userRating>=6` AND `lastPlayedAt < now-90d` OR null), sort by rating desc + lastPlayedAt asc; Random Picks 5 uniform distinct samples; Artist Spotlights eligibility `albumCount > 2` and exactly-2 exclusion; empty-group emits `[]` (FR-003)
- [x] T015 [P] [US1] Unit tests for round-robin in `backend/tests/unit/artist-spotlight-repo.test.ts` — NULLS FIRST ordering, tie-break by `artist_id` ASC, upsert updates `last_spotlighted_at`, stale row remains harmless when artist no longer eligible
- [x] T016 [P] [US1] Integration test in `backend/tests/integration/library-albums-groups.test.ts` — mocks Plex client, exercises `GET /api/v1/library/albums/groups?libraryId=…`, asserts JSON shape matches `AlbumGroupsResponseSchema`, asserts 404 when no Plex connection
- [x] T017 [P] [US1] Component test in `frontend/tests/unit/AlbumGroupRow.test.tsx` — group with 0 items renders nothing (FR-003); group with 1–5 items renders that many cards; group with >5 items renders only the first 5; heading uses correct semantic level (FR-034)
- [x] T018 [P] [US1] Component test in `frontend/tests/unit/AlbumsHomePage.test.tsx` — given a mocked TanStack Query response, renders groups in the FR-002 order; hides empty groups; renders the `BrowseAllTile` inside Random Picks

### Implementation for User Story 1

#### Backend

- [x] T019 [US1] Create `backend/src/services/plex/artist-spotlight-repo.ts` exposing `selectLeastRecentlyShown(eligibleArtistIds: string[], limit: number)` and `markShown(artistIds: string[], at: Date)` using Drizzle and the new `artistSpotlightState` table; query uses `ORDER BY last_spotlighted_at ASC NULLS FIRST, artist_id ASC` (research.md §5); upsert with `ON CONFLICT (artist_id) DO UPDATE`
- [x] T020 [US1] Create `backend/src/services/plex/album-groups-service.ts` exposing `getAlbumGroups(libraryId: string)` that: (a) loads all albums via existing `library-service` (with the enriched `AlbumWithStats` from T011), (b) loads 30-day track scrobble counts and aggregates by `parentRatingKey`, (c) builds the five arrays per `research.md` §2 / §4, (d) calls `artist-spotlight-repo` to pick + mark eligible artists, (e) fetches up to 3 cover URLs per chosen artist, (f) returns `AlbumGroupsResponse`. Random Picks reseeded per call (FR-028).
- [x] T021 [US1] Extend `backend/src/services/plex/library-service.ts` to expose the enriched album list (preserving the existing 60 s in-memory `albumCache`) and a helper for the 30-day per-album play-count aggregation described in `data-model.md` (Plex `/library/sections/{id}/all?type=10&viewedAt>{now-30d}` or fallback to history endpoint)
- [x] T022 [US1] Register the new route `GET /api/v1/library/albums/groups` in `backend/src/api/routes/library.ts` — validates `libraryId` query param with Zod, calls `getAlbumGroups`, responds with `AlbumGroupsResponse`; 404 on missing Plex connection

#### Frontend

- [x] T023 [P] [US1] Create `frontend/src/components/albums/PlayAlbumOverlay.tsx` — a focusable `Button` (shadcn/ui) absolutely positioned over the cover with translucent background; receives `onActivate` and `albumTitle` props; exposes accessible name `Play <albumTitle>` (FR-015 / FR-018); fades in on `:hover` and `:focus-within` of the parent card via Tailwind classes
- [x] T024 [P] [US1] Create `frontend/src/components/albums/AlbumCard.tsx` — a shadcn/ui `Card` + `AspectRatio` composite that renders the cover image (with `loading="lazy"` per FR-032), the `PlayAlbumOverlay`, and a separately focusable details `Link` wrapping the title/artist text (FR-013 / FR-014 / FR-017). NOTE: in US1 the play button is a stub that does nothing (or fires a placeholder callback); the live wiring is added in US2. The details link is functional in US1.
- [x] T025 [P] [US1] Create `frontend/src/components/albums/ArtistSpotlightTile.tsx` — a focusable container rendering up to 3 covers in stacked CSS (rotation/offset per `research.md` §8), the artist name, a play affordance (stub in US1, wired in US4), and a separately focusable details link to `/artists/:artistId` (FR-012 / FR-022)
- [x] T026 [P] [US1] Create `frontend/src/components/albums/BrowseAllTile.tsx` — a larger shadcn/ui `Card` that links to `/albums/all` (route added by US5); render a "Browse All Albums" label and a generic icon; sized to span the slot of an album card + extra (FR-010). Until US5 lands the tile is still rendered but the route is a placeholder.
- [x] T027 [P] [US1] Create `frontend/src/components/albums/AlbumGroupRow.tsx` — accepts `{ title: string; entries: ReactNode[] }`; returns `null` when `entries.length === 0` (FR-003); renders an `<h2>` heading (FR-034) and a horizontally scrollable flex/grid row; group keyboard-navigation per FR-033
- [x] T028 [US1] Add `getAlbumGroups(libraryId)` to `frontend/src/services/api-client.ts` and a `useAlbumGroups(libraryId)` TanStack Query hook (60 s `staleTime`, refetch on window focus disabled) in a new file `frontend/src/hooks/use-album-groups.ts`
- [x] T029 [US1] Create `frontend/src/pages/AlbumsHomePage.tsx` — fetches groups via `useAlbumGroups`, renders shadcn `Skeleton` rows during initial load, then renders the five `AlbumGroupRow`s in FR-002 order using `AlbumCard` / `ArtistSpotlightTile` / `BrowseAllTile`; empty groups hidden by `AlbumGroupRow` (FR-003)
- [x] T030 [US1] Update `frontend/src/App.tsx` — root `/` route now renders `AlbumsHomePage` (was `AlbumGridPage`); leave `/albums/:id` and other existing detail routes unchanged; do NOT delete `AlbumGridPage.tsx` yet (cleanup happens in Polish phase once US5 lands)

**Checkpoint**: User Story 1 is independently testable — `/api/v1/library/albums/groups` returns curated groups and `/` renders them with stub play buttons and working details links.

---

## Phase 4: User Story 2 — Start playing an album from its card (Priority: P1)

**Goal**: Clicking an `AlbumCard`'s play overlay starts the album, replaces the queue, and switches to the Now Playing view in a single user action.

**Independent Test**: From `AlbumsHomePage`, click any card's play button → queue is replaced with that album's tracks in order → first track is playing → route is `/now-playing`. Clicking the same album again restarts from track 1 at 0:00.

### Tests for User Story 2

- [x] T031 [P] [US2] Unit test in `frontend/tests/unit/use-play-album.test.tsx` — hook fetches tracks, calls `playNow` BEFORE `navigate("/now-playing")` (FR-016a); calling with the currently-playing album rebuilds the queue and resets position (FR-016c)
- [x] T032 [P] [US2] Component test in `frontend/tests/unit/AlbumCard.test.tsx` — clicking the play overlay invokes the `usePlayAlbum` hook (mocked); clicking the cover-body / title / artist navigates to `/albums/:id` and does NOT play (FR-017); touch tap on play button triggers play (FR-019)

### Implementation for User Story 2

- [x] T033 [US2] Create `frontend/src/hooks/use-play-album.ts` exporting `usePlayAlbum()` per `research.md` §7 — returns an async callback `(albumId: string) => Promise<void>` that calls `api.getAlbumTracks(albumId)`, then `playbackQueueStore.playNow(tracks)`, then `navigate("/now-playing")` in that order
- [x] T034 [US2] Wire `AlbumCard` (created in T024) to invoke `usePlayAlbum` from its `PlayAlbumOverlay.onActivate`; ensure the play button uses `e.stopPropagation()` so the details link is not also triggered; verify keyboard activation (Enter / Space) works via the underlying shadcn `Button`

**Checkpoint**: Hover-to-play works end-to-end across every card on `AlbumsHomePage`. US3 details navigation continues to work because the click handlers are kept separate.

---

## Phase 5: User Story 3 — Navigate into album details from the card (Priority: P1)

**Goal**: Clicking title, artist, or cover-body opens the album detail page; play button and details link are independent focusable controls; back navigation preserves scroll/group state.

**Independent Test**: Tab into an `AlbumCard` → first stop is the play button (accessible name "Play <Title>"), second stop is the details link (accessible name "Open details for <Title>"); Enter on the second stop navigates to `/albums/:id`; browser-back returns to `AlbumsHomePage` with prior scroll position.

### Tests for User Story 3

- [x] T035 [P] [US3] Extend `frontend/tests/unit/AlbumCard.test.tsx` (from T032) with keyboard-tab-order assertions per FR-018: 2 focusable elements per card, in (play, details) order, each with the documented accessible names
- [x] T036 [P] [US3] Add accessibility test using `jest-axe` against a rendered `AlbumsHomePage` snapshot in `frontend/tests/unit/AlbumsHomePage.a11y.test.tsx` — no axe violations on default render (SC-006)

### Implementation for User Story 3

- [x] T037 [US3] Confirm/finalize `AlbumCard` accessibility from T024: two focusable children, descriptive `aria-label`s (`Play <title>`, `Open details for <title>`), visible focus indicator from shadcn defaults (FR-018 / FR-033)
- [x] T038 [US3] Ensure scroll-position restoration in `frontend/src/App.tsx` — if the existing `<BrowserRouter>` doesn't auto-restore scroll, mount a `ScrollRestoration` component (React Router v6.4+) or attach a `useScrollRestoration` hook in `AlbumsHomePage` keyed on route; satisfies FR-016b / FR-029

**Checkpoint**: All three P1 stories are functional. This is the MVP — the app delivers value: browse curated groups → play OR open detail → back navigation works.

---

## Phase 6: User Story 4 — Artist Spotlight plays full discography in order (Priority: P2)

**Goal**: Activating an Artist Spotlight tile's play affordance queues every album by that artist oldest-to-newest and switches to Now Playing; activating the details affordance navigates to that artist's albums page.

**Independent Test**: An artist with 3 albums (years 1995, 2001, 2008) plays tracks in album-1995 → album-2001 → album-2008 order from the first track of the 1995 album; same-year ties break by title then by ID; Now Playing reflects the first track.

### Tests for User Story 4

- [x] T039 [P] [US4] Unit test in `frontend/tests/unit/use-play-artist.test.tsx` — given a mocked `getArtistAlbums` returning unsorted albums, the resolved queue is sorted by `(releaseYear asc, title asc, id asc)` per FR-021; first track of the earliest album is `currentIndex: 0`
- [x] T040 [P] [US4] Component test in `frontend/tests/unit/ArtistSpotlightTile.test.tsx` — play affordance triggers `usePlayArtist`; details affordance navigates to `/artists/:artistId`; tile is keyboard-reachable (FR-022 / FR-033)

### Implementation for User Story 4

- [x] T041 [US4] Create `frontend/src/hooks/use-play-artist.ts` exporting `usePlayArtist()` — async callback `(artistId: string) => Promise<void>` that fetches the artist's albums (existing `api.getArtistAlbums` if available, else add one), sorts oldest-to-newest with `(year asc, title asc, id asc)` tie-breakers, fetches tracks for each album in order, concatenates them, calls `playbackQueueStore.playNow(allTracks)`, then `navigate("/now-playing")` (FR-020 / FR-021)
- [x] T042 [US4] Wire `ArtistSpotlightTile` (created in T025) to invoke `usePlayArtist` from its play affordance and `Link` to `/artists/:artistId` from its details affordance; ensure click-event isolation between the two affordances

**Checkpoint**: Artist Spotlights are fully interactive. All Story 1–4 functionality is now live.

---

## Phase 7: User Story 5 — Browse All alphabetically with "The"-aware sort (Priority: P2)

**Goal**: Clicking the `BrowseAllTile` opens an A–Z view of every album sorted with `"The"`-aware rules, rendering smoothly on 10k+ albums.

**Independent Test**: `/albums/all` shows every album; "The Wall" sorts under "W"; "A Night At The Opera" sorts under "A"; an album literally titled "The" sorts under "T"; SC-004 verifies 60 fps scroll on a 10k-album fixture.

### Tests for User Story 5

- [x] T043 [P] [US5] Unit tests in `backend/tests/unit/album-sort-the-article.test.ts` against a fixture of ≥20 representative titles (SC-007), exercising: literal "The " prefix, "A "/"An " not stripped, all-caps "THE", "The" with no trailing word, leading numerals (FR-026), punctuation-only titles
- [x] T044 [P] [US5] Unit tests in `frontend/tests/unit/album-sort-the-article.test.ts` using the SAME ≥20-title fixture (copy as JSON or inline) to assert tier parity between `frontend/src/lib/album-sort.ts` and `backend/src/services/plex/album-sort.ts`
- [x] T045 [P] [US5] Integration test in `backend/tests/integration/library-albums-all.test.ts` — `GET /api/v1/library/albums/all?libraryId=…` returns items sorted by `sortKey`; `Cache-Control` header is `private, max-age=60, stale-while-revalidate=600`; 404 when no Plex connection
- [x] T046 [P] [US5] Component test in `frontend/tests/unit/BrowseAllAlbumsPage.test.tsx` — given a mocked response of 50 albums with mixed "The" prefixes, items render in the expected order; `content-visibility: auto` style is applied to off-screen row containers

### Implementation for User Story 5

#### Backend

- [x] T047 [US5] Create `backend/src/services/plex/album-list-service.ts` exposing `getAllAlbums(libraryId: string)` that loads the cached full album list, maps each to `AlbumListItem` with `sortKey = sortKeyForTitle(title)`, and returns items sorted via `Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare(a.sortKey, b.sortKey)` (research.md §3) plus a `total` count
- [x] T048 [US5] Register `GET /api/v1/library/albums/all` in `backend/src/api/routes/library.ts` — validates `libraryId`, calls `getAllAlbums`, sets `Cache-Control: private, max-age=60, stale-while-revalidate=600`, responds with `AllAlbumsResponse`; 404 on missing Plex connection

#### Frontend

- [x] T049 [US5] Add `getAllAlbums(libraryId)` to `frontend/src/services/api-client.ts` and a `useAllAlbums(libraryId)` TanStack Query hook in `frontend/src/hooks/use-all-albums.ts` (long `staleTime`, single fetch sufficient for a session)
- [x] T050 [US5] Create `frontend/src/pages/BrowseAllAlbumsPage.tsx` — renders a CSS-grid container; each row uses `style={{ contentVisibility: "auto", containIntrinsicSize: "<row-height>" }}` for virtualization (research.md §6); cover images use `loading="lazy"`; each row links to `/albums/:id` and exposes the same play overlay as `AlbumCard` reusing `PlayAlbumOverlay` + `usePlayAlbum` (FR-016 applies here too)
- [x] T051 [US5] Add the `/albums/all` route in `frontend/src/App.tsx` rendering `BrowseAllAlbumsPage`; verify the `BrowseAllTile` link from T026 now resolves correctly

**Checkpoint**: All five user stories are complete and independently demonstrable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, legacy redirects, defensive integrations, and end-to-end verification against the quickstart.

- [x] T052 Delete `frontend/src/pages/AlbumGridPage.tsx` and remove any remaining imports/usages (FR-001a); the new `AlbumsHomePage` fully supersedes it
- [x] T053 Add a legacy redirect route in `frontend/src/App.tsx` — `<Route path="albums" element={<Navigate to="/" replace />} />` so any bookmarked `/albums` URLs resolve cleanly (FR-001b)
- [x] T054 Extend `backend/src/services/plex/data-wipe-service.ts` (from feature 002) to also `TRUNCATE artist_spotlight_state` on Plex server/account switch; document this in the file's header comment (data-model.md §"Entity Relationships")
- [x] T055 [P] Verify the service worker `stale-while-revalidate` strategy correctly caches `GET /api/v1/library/albums/groups` and `GET /api/v1/library/albums/all`; if the SW route table is allowlist-based, add the two new paths in `frontend/src/sw/` (or equivalent) per plan §Constitution Check row "offline-first PWA"
- [x] T056 [P] Run jest-axe over `AlbumsHomePage` and `BrowseAllAlbumsPage` and resolve any violations; document SC-006 result
- [x] T057 [P] Measure SC-003 (FMP < 2 s on ~1,000-album library) and SC-004 (60 fps scroll on 10,000-album library) per `quickstart.md` §6; record results in `specs/003-albums-library-view/quickstart.md` (append a "Verification results" subsection) or attach to the feature PR
- [x] T058 Execute the full `quickstart.md` §4 manual verification matrix (Stories 1–5) and check off each item; file follow-up issues for any deviation
- [x] T059 Final lint + typecheck sweep across `backend/`, `frontend/`, and `packages/shared-types/`; run `npm test` in both `backend/` and `frontend/` from a clean state and confirm green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code dependencies; sanity checks only
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **US1 (Phase 3)**: Depends on Foundational. Other stories may also start once Foundational is done.
- **US2 (Phase 4)**: Depends on Foundational; wires into `AlbumCard` created in US1 (T024) — keep the play affordance a stub in US1 if US2 hasn't started, or merge US1+US2 if developed by the same person.
- **US3 (Phase 5)**: Depends on Foundational; refines `AlbumCard` (T024) and `App.tsx` (T030). Can be parallel with US2.
- **US4 (Phase 6)**: Depends on Foundational; refines `ArtistSpotlightTile` (T025). Independent of US2/US3.
- **US5 (Phase 7)**: Depends on Foundational; can be implemented in parallel with US1–US4. The `BrowseAllTile` (T026) renders before US5 lands but the route is dead until T051.
- **Polish (Phase 8)**: Depends on US1–US5 being complete (T052 in particular requires US1 routes to be live).

### Within Each User Story

- Tests are listed before implementation per Spec Kit convention; teams practising TDD may write them first, but they are not required to fail before implementation.
- Backend services before backend routes.
- Frontend primitives (`PlayAlbumOverlay`, `AlbumCard`) before higher-level compositions (`AlbumGroupRow`, `AlbumsHomePage`).
- Hooks (`use-play-album`, `use-play-artist`) before wiring them into components.

### Parallel Opportunities

- **Foundational [P] tasks**: T006, T007, T008, T009 (all touch the same file `packages/shared-types/src/api/schemas.ts` — DO NOT actually run in parallel despite the [P]; the [P] reflects "no logical dependency", but they share a file. Sequence them.) T012 and T013 are in different files and ARE parallelizable. T011 is sequential after T006.
- **US1 backend tests** (T014, T015, T016) can be authored in parallel — different files.
- **US1 frontend primitives** (T023, T024, T025, T026, T027) can be authored in parallel — different files.
- **US2 / US3 / US4 / US5**: After Foundational completes, four developers could pick up one user story each.
- **Sort-parity tests** (T043 + T044) are in different files and ARE parallelizable.

> Note on the [P] marker and shared files: T006–T010 all touch `packages/shared-types/src/api/schemas.ts` and `index.ts`. They are conceptually independent additions but a single editor must serialize the writes to avoid merge conflicts. Implement them in one PR (or one developer's local sequence).

---

## Parallel Example: Foundational Phase

```bash
# Sequence the shared-types edits (single file):
Task: T006 "Extend Album schema with userRating + addedAt in packages/shared-types/src/api/schemas.ts"
Task: T007 "Add ArtistSpotlightSchema in packages/shared-types/src/api/schemas.ts"
Task: T008 "Add AlbumGroupsResponseSchema in packages/shared-types/src/api/schemas.ts"
Task: T009 "Add AlbumListItemSchema + AllAlbumsResponseSchema in packages/shared-types/src/api/schemas.ts"
Task: T010 "Re-export from packages/shared-types/src/index.ts"

# These can truly run in parallel (different files):
Task: T011 "Extend parseAlbumFromMetadata in backend/src/services/plex/plex-client.ts"
Task: T012 "Add frontend sortKeyForTitle in frontend/src/lib/album-sort.ts"
Task: T013 "Add backend sortKeyForTitle in backend/src/services/plex/album-sort.ts"
```

## Parallel Example: User Story 1 Frontend

```bash
# After Foundational completes — five different files, run together:
Task: T023 "Create PlayAlbumOverlay.tsx"
Task: T024 "Create AlbumCard.tsx"
Task: T025 "Create ArtistSpotlightTile.tsx"
Task: T026 "Create BrowseAllTile.tsx"
Task: T027 "Create AlbumGroupRow.tsx"
```

---

## Implementation Strategy

### MVP First (P1 stories — US1 + US2 + US3)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational) — **critical blocker**.
3. Complete Phase 3 (US1) — curated groups land, play buttons are stubs.
4. Complete Phase 4 (US2) — play buttons go live.
5. Complete Phase 5 (US3) — details navigation + scroll restoration polish.
6. **STOP and VALIDATE**: Manual quickstart walk-through for Stories 1–3.
7. Deploy MVP if approved.

### Incremental Delivery (recommended)

1. **MVP cut**: Setup + Foundational + US1 + US2 + US3 → demo "browse + play + open details".
2. **+ Artist Spotlight**: Add Phase 6 (US4) → demo deep-discography play.
3. **+ Browse All**: Add Phase 7 (US5) → demo full-library alphabetical view.
4. **Polish**: Phase 8 cleanup + verification.

### Parallel Team Strategy

After Foundational (Phase 2) completes:

- Developer A: US1 (curated groups end-to-end — biggest slice)
- Developer B: US5 (Browse All + sort tier-parity tests)
- Developer C: US4 (Artist Spotlight playback)
- Once US1's `AlbumCard` is in main, Developer A or D layers in US2 + US3 on top.
- Polish phase is a final shared sweep.

---

## Notes

- [P] = different files, no logical dependency on incomplete tasks. Where multiple [P] tasks touch the same file (T006–T010), implement them in sequence within one editor session.
- [Story] label maps each task to a user story for traceability.
- Tests are listed before implementation but are not required to fail first; teams practising TDD may invert the order.
- Constitution Principle V: **no new npm dependencies** are introduced by any task in this list. If a task seems to require one, stop and revisit `research.md` for the no-dependency alternative.
- Commit after each task or logical group (the `after_tasks` hook will offer to auto-commit `tasks.md` itself).
- Each user story is independently testable per its "Independent Test" criterion — stop at any phase boundary to validate.
