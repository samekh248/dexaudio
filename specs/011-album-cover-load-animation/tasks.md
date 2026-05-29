---
description: "Task list for feature 011 — Album Cover Load Animation"
---

# Tasks: Album Cover Load Animation

**Input**: Design documents from `/specs/011-album-cover-load-animation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-album-cover-reveal.md](./contracts/ui-album-cover-reveal.md), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md requires Vitest unit tests for `use-album-cover-load`, `AlbumCoverImage`, and extended `AlbumCard` behavior.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only; no backend changes. US1 is MVP (single-card reveal on albums home). US2 extends to grid and spotlight views. US3 covers absent/failed art. US4 covers reduced-motion accessibility.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1–US4). Omitted on Setup, Foundational, and Polish tasks.
- Paths are repository-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch verification and test scaffolding before cover-reveal work.

- [X] T001 Verify branch `011-album-cover-load-animation` is checked out and `specs/011-album-cover-load-animation/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [X] T002 [P] Run `cd frontend && npm test` — confirm green baseline before cover animation changes
- [X] T003 [P] Create `frontend/tests/unit/use-album-cover-load.test.ts` with Vitest imports and empty describe blocks for phase transitions
- [X] T004 [P] Create `frontend/tests/unit/AlbumCoverImage.test.tsx` with Vitest + RTL imports and empty describe blocks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared CSS, hook, cover component, and overlay gate. **No user story integration until this phase completes.**

**⚠️ CRITICAL**: US1–US4 depend on `use-album-cover-load.ts`, `AlbumCoverImage.tsx`, and reveal keyframes in `themes.css`.

- [X] T005 Add `@keyframes album-cover-reveal`, `album-cover-fade-in`, `.album-cover-reveal`, `.album-cover-reveal--fade-only`, and `.album-cover-reveal-sync` classes with `@media (prefers-reduced-motion: reduce)` override in `frontend/src/styles/themes.css` per [contracts/ui-album-cover-reveal.md](./contracts/ui-album-cover-reveal.md) (~300ms, 6px bounce)
- [X] T006 Create `frontend/src/hooks/use-album-cover-load.ts` — export `CoverLoadPhase`, session `REVEALED_URL_CACHE` Set, 10s timeout, mount-time `img.complete` check, phases `pending | revealing | revealed | failed | absent` per [data-model.md](./data-model.md)
- [X] T007 Create `frontend/src/components/albums/AlbumCoverImage.tsx` — empty slot while pending, hidden `<img>` until load, fallback for absent/failed, apply reveal class on `revealing`, optional `onPhaseChange` callback per [contracts/ui-album-cover-reveal.md](./contracts/ui-album-cover-reveal.md)
- [X] T008 Add `revealComplete?: boolean` prop (default `true`) to `frontend/src/components/albums/PlayAlbumOverlay.tsx` — when `false`, force `pointer-events-none opacity-0` regardless of group hover (FR-009)
- [X] T009 [P] Unit tests in `frontend/tests/unit/use-album-cover-load.test.ts` — `pending → revealing → revealed` on load, cached URL skip via Set, `absent` when no URL
- [X] T010 [P] Component tests in `frontend/tests/unit/AlbumCoverImage.test.tsx` — empty slot while pending, no visible partial image, fallback for absent URL

**Checkpoint**: Hook and `AlbumCoverImage` pass T009–T010 in isolation; CSS classes defined.

---

## Phase 3: User Story 1 — Smooth reveal of album cover art (Priority: P1) 🎯 MVP

**Goal**: Each album card hides cover until fully loaded, then fades in with bounce; title/artist sync; play overlay gated until reveal.

**Independent Test**: Throttle network on `/`, confirm empty slots → fade-bounce reveal per card, synchronized text, no play overlay until reveal completes.

### Tests for User Story 1

- [X] T011 [P] [US1] Extend `frontend/tests/unit/AlbumCard.test.tsx` — title/artist hidden while pending, visible after reveal; play overlay not hover-visible until `revealComplete`

### Implementation for User Story 1

- [X] T012 [US1] Refactor `frontend/src/components/albums/AlbumCard.tsx` — replace inline `<img>` with `AlbumCoverImage`, wire `onPhaseChange` to gate `CardContent` opacity via `.album-cover-reveal-sync`, pass `revealComplete` to `PlayAlbumOverlay` (FR-001–FR-005, FR-012)

**Checkpoint**: Albums home group rows show wait-then-reveal on `AlbumCard`; T011 passes; no partial images under throttled network.

---

## Phase 4: User Story 2 — Consistent behavior across albums library views (Priority: P1)

**Goal**: Same cover reveal on browse-all grid, category pages, and artist spotlight stack layers.

**Independent Test**: Visit `/`, `/albums/all`, `/library/recently-added`, and artist spotlight row — identical reveal behavior on all cover surfaces.

### Implementation for User Story 2

- [X] T013 [P] [US2] Refactor `frontend/src/components/albums/AlbumGrid.tsx` — use `AlbumCoverImage`, sync title/artist visibility, gate `PlayAlbumOverlay` with `revealComplete` (mirror `AlbumCard` pattern)
- [X] T014 [P] [US2] Refactor `frontend/src/components/albums/ArtistSpotlightTile.tsx` — replace stack layer `<img>` elements with `AlbumCoverImage`; keep artist name/album count in `CardContent` visible immediately per [research.md](./research.md) §6 (FR-006)

**Checkpoint**: Browse-all and category grids match home card behavior; spotlight stack layers reveal independently; artist metadata always visible.

---

## Phase 5: User Story 3 — Graceful missing or failed cover art (Priority: P2)

**Goal**: Albums without art or with failed loads show immediate fallback; no infinite hidden slots.

**Independent Test**: View album with no `artUrl` and block a cover URL — fallback + title/play within 10s, no entrance animation.

### Tests for User Story 3

- [X] T015 [P] [US3] Extend `frontend/tests/unit/use-album-cover-load.test.ts` — `onError → failed`, 10s timeout → failed, URL added to cache only on successful reveal (not on failed)
- [X] T016 [P] [US3] Extend `frontend/tests/unit/AlbumCoverImage.test.tsx` — failed/timeout shows fallback immediately without reveal class; title parent receives `revealComplete` true for absent/failed

### Implementation for User Story 3

- [X] T017 [US3] Harden error/timeout paths in `frontend/src/hooks/use-album-cover-load.ts` and `frontend/src/components/albums/AlbumCoverImage.tsx` — ensure `AlbumCard` and `AlbumGrid` show title/artist and enable play overlay immediately when phase is `absent` or `failed` (FR-007, FR-008)

**Checkpoint**: Missing and failed art never leave permanent empty slots; T015–T016 pass.

---

## Phase 6: User Story 4 — Accessible reduced motion (Priority: P3)

**Goal**: Users with reduced-motion preference get fade-in only (no bounce) on cover and synchronized text.

**Independent Test**: Enable OS reduce motion, reload `/` — covers fade without upward movement.

### Tests for User Story 4

- [X] T018 [P] [US4] Extend `frontend/tests/unit/use-album-cover-load.test.ts` — mock `matchMedia('(prefers-reduced-motion: reduce)')` returns `true`, assert fade-only class selected (no bounce transform class)
- [X] T019 [P] [US4] Extend `frontend/tests/unit/AlbumCoverImage.test.tsx` — reduced-motion path applies `.album-cover-reveal--fade-only` not full bounce class

### Implementation for User Story 4

- [X] T020 [US4] Verify `frontend/src/styles/themes.css` reduced-motion media query disables translate on `.album-cover-reveal` and that `use-album-cover-load.ts` selects fade-only variant when preference detected (FR-010, SC-005)

**Checkpoint**: Reduced motion shows fade only; T018–T019 pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, re-render stability, manual validation.

- [X] T021 [P] Add test in `frontend/tests/unit/use-album-cover-load.test.ts` — URL in `REVEALED_URL_CACHE` on remount skips animation (FR-011)
- [X] T022 Run `cd frontend && npm test` — full frontend suite green
- [ ] T023 Execute manual checklist in `specs/011-album-cover-load-animation/quickstart.md` (throttled network, missing art, reduced motion, re-render stability, zero CLS)
- [ ] T024 [P] Fix any test or implementation gaps found during T023; update `quickstart.md` only if steps diverge from actual UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: Depend on Foundational completion
  - US1 (Phase 3) before US2 (Phase 4) recommended — US2 mirrors US1 integration pattern
  - US3 and US4 can overlap US2 after Foundational if hook/CSS already include error and reduced-motion paths
- **Polish (Phase 7)**: Depends on US1–US4 completion

### User Story Dependencies

| Story | Priority | Depends on | Delivers independently |
|-------|----------|------------|------------------------|
| US1 | P1 | Foundational | ✅ AlbumCard reveal on home rows |
| US2 | P1 | Foundational, US1 pattern | ✅ Grid + spotlight consistency |
| US3 | P2 | Foundational | ✅ Fallback/timeout behavior |
| US4 | P3 | Foundational | ✅ Reduced-motion fade only |

### Within Each User Story

- Tests before or alongside implementation (same phase)
- Hook/CSS (Foundational) before component integration
- `AlbumCard` (US1) before `AlbumGrid` / spotlight (US2)

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 in parallel
- **Phase 2**: T009 and T010 in parallel after T006–T007
- **Phase 4**: T013 and T014 in parallel
- **Phase 5**: T015 and T016 in parallel
- **Phase 6**: T018 and T019 in parallel
- **Phase 7**: T021 and T024 in parallel with T022 prep

---

## Parallel Example: User Story 2

```bash
# After US1 checkpoint, launch grid and spotlight together:
Task T013: Refactor AlbumGrid.tsx
Task T014: Refactor ArtistSpotlightTile.tsx
```

---

## Parallel Example: Foundational

```bash
# After T006–T008 land, run tests in parallel:
Task T009: use-album-cover-load.test.ts
Task T010: AlbumCoverImage.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical**)
3. Complete Phase 3: User Story 1 (`AlbumCard` on albums home)
4. **STOP and VALIDATE**: Throttled network on `/` — empty slots, fade-bounce, gated overlay
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → shared hook/component ready
2. US1 → home page album cards polished (**MVP**)
3. US2 → browse-all, categories, artist spotlight stacks
4. US3 → harden absent/failed paths + tests
5. US4 → reduced-motion verification + tests
6. Polish → full suite + quickstart manual pass

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 + US2 (component integration)
   - Developer B: US3 + US4 (edge cases + a11y tests)
3. Merge and run Polish phase together

---

## Notes

- No new npm packages — CSS keyframes only (Constitution V)
- Artist spotlight `CardContent` stays visible during stack load (clarification session 2026-05-29)
- Loading state is empty slot with no visible fill (not shimmer)
- Commit after each task or logical group; stop at any checkpoint to validate story independently
