---
description: "Task list for feature 022 — Album Group Slide-In Animation"
---

# Tasks: Album Group Slide-In Animation

**Input**: Design documents from `/specs/022-album-group-slide-in/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-library-group-reveal.md](./contracts/ui-library-group-reveal.md), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md requires Vitest unit tests for `use-library-group-reveal`, `LibraryGroupReveal`, and extensions to home-group tests.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only; no backend changes. US1 is MVP (group readiness gate + staggered slide on album home rows). US2 confirms carousel clipping. US3 extends to Random Picks, Browse All tile, and Artist Spotlights. US4 covers reduced motion, session skip, and failure/retry paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1–US4). Omitted on Setup, Foundational, and Polish tasks.
- Paths are repository-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch verification and test scaffolding before group-reveal work.

- [X] T001 Verify branch `022-album-group-slide-in` is checked out and `specs/022-album-group-slide-in/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [X] T002 [P] Run `cd frontend && npm test` — confirm green baseline before group slide-in changes
- [X] T003 [P] Create `frontend/tests/unit/use-library-group-reveal.test.ts` with Vitest imports and empty describe blocks for phase transitions and entry registry
- [X] T004 [P] Create `frontend/tests/unit/LibraryGroupReveal.test.tsx` with Vitest + RTL imports and empty describe blocks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared CSS, group-reveal hook/components. **No user story integration until this phase completes.**

**⚠️ CRITICAL**: US1–US4 depend on `use-library-group-reveal.ts`, `LibraryGroupReveal.tsx`, `GroupRevealEntry.tsx`, and keyframes in `themes.css`.

- [X] T005 Add `@keyframes library-group-entry-slide`, `.library-group-entry-slide` (stagger via `--group-entry-index`, 60ms × index, 400ms duration, -24px translateX), `.library-group-reveal-fade`, and `@media (prefers-reduced-motion: reduce)` overrides in `frontend/src/styles/themes.css` per [contracts/ui-library-group-reveal.md](./contracts/ui-library-group-reveal.md)
- [X] T006 Create `frontend/src/hooks/use-library-group-reveal.ts` — export `GroupRevealPhase`, `REVEALED_GROUP_KEYS` Set (`${libraryId}:${groupKey}`), entry registry, `prefers-reduced-motion` listener, phase transitions `preparing → animating → revealed` per [data-model.md](./data-model.md)
- [X] T007 Create `frontend/src/components/albums/LibraryGroupReveal.tsx` — context provider, `opacity-0` / `aria-hidden` while `preparing`, session skip when key in Set, props `groupKey`, `libraryId`, `entryCount`, `children` per [contracts/ui-library-group-reveal.md](./contracts/ui-library-group-reveal.md)
- [X] T008 Create `frontend/src/components/albums/GroupRevealEntry.tsx` — register `index` + `ready`, apply `.library-group-entry-slide` with `--group-entry-index` when parent phase is `animating`, disable interaction until `revealed`
- [X] T009 [P] Unit tests in `frontend/tests/unit/use-library-group-reveal.test.ts` — all entries ready opens gate, `preparing` until last ready, session key skips to `revealed`, library change clears Set
- [X] T010 [P] Component tests in `frontend/tests/unit/LibraryGroupReveal.test.tsx` — preparing hides row (`opacity-0`, `aria-hidden`), animating applies slide class, reduced motion uses fade-only path

**Checkpoint**: Hook and reveal components pass T009–T010 in isolation; CSS classes defined.

---

## Phase 3: User Story 1 — Coordinated reveal when a library group finishes loading (Priority: P1) 🎯 MVP

**Goal**: Each home group row stays in loading until every entry is cover-ready (invisibly), then cards slide in with left-to-right stagger; no interaction until reveal completes.

**Independent Test**: Throttle network on `/`; each album group shows pulse until API + all covers ready, then staggered slide-in with no partial cards or post-landing cover bounce.

### Tests for User Story 1

- [X] T011 [P] [US1] Extend `frontend/tests/unit/AlbumsHomePage.groups.test.tsx` — mock slow cover readiness; assert carousel entries not visible until all ready, then slide classes applied

### Implementation for User Story 1

- [X] T012 [P] [US1] Add optional `onRevealCompleteChange?: (complete: boolean) => void` to `frontend/src/components/albums/AlbumCard.tsx` — fire when `revealComplete` (terminal cover phase) changes (FR-001, FR-005)
- [X] T013 [US1] Modify `frontend/src/components/albums/LibraryGroupSection.tsx` — accept `libraryId`, wrap successful `children(items)` in `LibraryGroupReveal` with `groupKey`, `entryCount={items.length}` (FR-001, FR-004)
- [X] T014 [US1] Modify `frontend/src/pages/AlbumsHomePage.tsx` — pass `libraryId` to each `LibraryGroupSection`; wrap each `AlbumCard` in `GroupRevealEntry` with `index` and `ready` from `onRevealCompleteChange` for Recently Played, Recently Added, and Hidden Gems rows (FR-002, FR-006 partial)

**Checkpoint**: Three album groups on home show wait-then-staggered slide; T011 passes; no visible cards before group gate opens.

---

## Phase 4: User Story 2 — Polished motion inside carousel boundaries (Priority: P1)

**Goal**: Slide-in motion is clipped by the group horizontal scroll container and does not bleed into adjacent rows.

**Independent Test**: Group with 10+ entries on desktop — during reveal, off-screen motion is masked by carousel `overflow-x-auto`; adjacent group headings unaffected.

### Tests for User Story 2

- [X] T015 [P] [US2] Extend `frontend/tests/unit/AlbumGroupRow.test.tsx` — carousel scroll region retains `overflow-x-auto`; `GroupRevealEntry` children render inside scroll container (FR-003)

### Implementation for User Story 2

- [X] T016 [US2] Ensure `frontend/src/components/albums/GroupRevealEntry.tsx` and `LibraryGroupReveal.tsx` do not apply transforms on wrappers outside `AlbumGroupRow` scroll `ref` — slide classes on entry roots only; verify `relative min-w-0 flex-1` + `overflow-x-auto` clipping in `frontend/src/components/albums/AlbumGroupRow.tsx` (FR-003)

**Checkpoint**: Manual check on wide viewport with overflow group — no paint outside row bounds; T015 passes.

---

## Phase 5: User Story 3 — Consistent behavior across all home library groups (Priority: P2)

**Goal**: Random Picks (including Browse All tile), Artist Spotlights, and all five curated rows share the same gate + stagger pattern.

**Independent Test**: Load home with all groups populated — identical wait-then-slide behavior on Random Picks (+ Browse All) and Artist Spotlights; category “View all” and browse-all grid unchanged.

### Tests for User Story 3

- [X] T017 [P] [US3] Extend `frontend/tests/unit/AlbumsHomePage.groups.test.tsx` — Random Picks row waits for Browse All + albums; Artist Spotlights waits for all stack layers ready before reveal (FR-006, FR-007)

### Implementation for User Story 3

- [X] T018 [P] [US3] Add optional `onRevealCompleteChange?: (complete: boolean) => void` to `frontend/src/components/albums/ArtistSpotlightTile.tsx` — aggregate terminal phase for up to three `AlbumCoverImage` stack layers; `ready` when all visible layers terminal (FR-007)
- [X] T019 [US3] Complete `frontend/src/pages/AlbumsHomePage.tsx` — `GroupRevealEntry` for Random Picks albums + `BrowseAllTile` (`ready={true}` on mount); `GroupRevealEntry` for each `ArtistSpotlightTile` with spotlight readiness (FR-006, FR-007, FR-008)

**Checkpoint**: All five home groups use group reveal; `/albums/all` and category pages have no slide-in; T017 passes.

---

## Phase 6: User Story 4 — Accessible motion and failure handling (Priority: P3)

**Goal**: Reduced motion shows shared fade without slide/stagger; session skip on in-app return; failed covers and group retry do not deadlock or over-animate.

**Independent Test**: Enable OS reduce motion — groups fade in together. Navigate away and back — no re-slide. Fail one cover — group reveals after fallback timeout. Retry failed group — slide runs once.

### Tests for User Story 4

- [X] T020 [P] [US4] Extend `frontend/tests/unit/use-library-group-reveal.test.ts` — reduced motion skips stagger; `REVEALED_GROUP_KEYS` prevents `animating` on second mount with same key
- [X] T021 [P] [US4] Extend `frontend/tests/unit/LibraryGroupSection.test.tsx` — `aria-busy` true while preparing/animating; entries not focusable until `revealed` (FR-009, FR-005)

### Implementation for User Story 4

- [X] T022 [US4] Implement reduced-motion branch in `frontend/src/components/albums/LibraryGroupReveal.tsx` — apply `.library-group-reveal-fade` on container, suppress per-entry slide classes (FR-009)
- [X] T023 [US4] Wire session persistence and library reset in `frontend/src/hooks/use-library-group-reveal.ts` — add key on `revealed`; clear `REVEALED_GROUP_KEYS` when `libraryId` changes in `frontend/src/pages/AlbumsHomePage.tsx` (FR-012)
- [X] T024 [US4] Ensure group refetch after error in `frontend/src/components/albums/LibraryGroupSection.tsx` remounts reveal with fresh phase when key not in Set — slide once on successful retry, not on silent cache refresh (FR-010, edge: retry)

**Checkpoint**: SC-004 and SC-005 scenarios pass manual + automated checks; T020–T021 pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation alignment.

- [X] T025 [P] Run full `cd frontend && npm test` — all unit tests green including new group-reveal suites
- [X] T026 Execute manual validation checklist in [quickstart.md](./quickstart.md) — normal motion, reduced motion, re-entry skip, out-of-scope pages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on US1 (needs wired `GroupRevealEntry` in carousel)
- **US3 (Phase 5)**: Depends on US1 (extends same `AlbumsHomePage` wiring)
- **US4 (Phase 6)**: Depends on Foundational; integrates best after US1–US3 wiring complete
- **Polish (Phase 7)**: Depends on desired user stories complete

### User Story Dependencies

| Story | Priority | Depends on | Can test independently after |
|-------|----------|------------|------------------------------|
| US1 | P1 | Foundational | Phase 3 checkpoint — three album groups |
| US2 | P1 | US1 | Phase 4 checkpoint — clipping |
| US3 | P2 | US1 | Phase 5 checkpoint — all five groups |
| US4 | P3 | Foundational + US1 | Phase 6 checkpoint — a11y/session/failure |

### Within Each User Story

- Tests written to fail before implementation (where listed first in phase)
- Hook/CSS before components; components before page wiring
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 in parallel after T001
- **Phase 2**: T009, T010 in parallel after T005–T008
- **Phase 3**: T011 parallel with T012; T014 after T013
- **Phase 5**: T018 parallel with T017 (different files)
- **Phase 6**: T020, T021 parallel; T022–T024 sequential on reveal hook/section

### Parallel Example: Foundational

```bash
# After T005–T008 land:
Task: "Unit tests in frontend/tests/unit/use-library-group-reveal.test.ts"
Task: "Component tests in frontend/tests/unit/LibraryGroupReveal.test.tsx"
```

### Parallel Example: User Story 3

```bash
Task: "ArtistSpotlightTile onRevealCompleteChange in frontend/src/components/albums/ArtistSpotlightTile.tsx"
Task: "Extend AlbumsHomePage.groups.test.tsx for Random Picks and spotlights"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational (**critical**)  
3. Complete Phase 3: User Story 1  
4. **STOP and VALIDATE**: [quickstart.md](./quickstart.md) §3 on three album groups  
5. Demo staggered group reveal on home  

### Incremental Delivery

1. Setup + Foundational → infrastructure ready  
2. US1 → album groups animate (MVP)  
3. US2 → clipping verified  
4. US3 → Random Picks + Artist Spotlights  
5. US4 → reduced motion + session + retry  
6. Polish → full suite + manual quickstart  

### Parallel Team Strategy

1. Team completes Setup + Foundational together  
2. After Foundational:  
   - Developer A: US1 + US2 (home wiring + clipping)  
   - Developer B: US3 (spotlight + random picks) — after US1 `LibraryGroupSection` API stable  
   - Developer C: US4 (a11y/session) — can start hook tests in parallel with US1  

---

## Notes

- No backend or `packages/shared-types` changes for this feature.  
- Coordinate with feature 011: covers complete while row is `preparing` (invisible); group slide is the only **visible** entrance (clarification session 2026-06-01).  
- [P] tasks touch different files; avoid two agents editing `AlbumsHomePage.tsx` simultaneously.  
- Commit after each phase checkpoint.  
- Total tasks: **26** (T001–T026).
