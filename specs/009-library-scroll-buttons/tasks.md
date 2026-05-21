---
description: "Task list for feature 009 — Library Scroll Buttons"
---

# Tasks: Library Scroll Buttons

**Input**: Design documents from `/specs/009-library-scroll-buttons/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-carousel.md](./contracts/ui-carousel.md), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md and quickstart.md require Vitest unit tests for `useHorizontalCarousel` scroll math and `AlbumGroupRow` button visibility.

**Organization**: Tasks grouped by user story (US1–US3). Frontend-only; no backend changes. US1 is the MVP; US2 verifies uniform behavior across all home rows; US3 covers accessibility and alternate navigation paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1–US3). Omitted on Setup, Foundational, and Polish tasks.
- Paths are repository-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch verification and test scaffolding before carousel changes.

- [ ] T001 Verify branch `009-library-scroll-buttons` is checked out and `specs/009-library-scroll-buttons/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [ ] T002 [P] Run `cd frontend && npm test` — confirm green baseline before carousel changes
- [ ] T003 [P] Create `frontend/tests/unit/use-horizontal-carousel.test.ts` with empty describe block and Vitest/RTL imports wired

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Scroll hook, scrollbar-hide CSS, and hook unit tests. **No user story UI work until this phase completes.**

**⚠️ CRITICAL**: US1–US3 depend on `useHorizontalCarousel` and hidden-scrollbar styling.

- [ ] T004 Add `.scrollbar-hide` utility to `frontend/src/styles/themes.css` per `research.md` §4 (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none }`)
- [ ] T005 Create `frontend/src/hooks/use-horizontal-carousel.ts` — export hook with `scrollRef`, `scrollForward`, `scrollBackward`, `canScrollLeft`, `canScrollRight`, `needsScrollControls`; constants `SCROLL_EPSILON=2`, `MIN_SCROLL_STEP=1` per `data-model.md`
- [ ] T006 Implement visible-entry counting in `frontend/src/hooks/use-horizontal-carousel.ts` — iterate direct children, `getBoundingClientRect` full-visibility check with 1 px tolerance; return min 1 when count is 0 (FR-012)
- [ ] T007 Implement `scrollForward` / `scrollBackward` in `frontend/src/hooks/use-horizontal-carousel.ts` — step by visible count, clamp target index, final page aligns last child to trailing edge, snap via `scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' })` per `research.md` §3
- [ ] T008 Wire `ResizeObserver` and `scroll` listeners in `frontend/src/hooks/use-horizontal-carousel.ts` — recompute `canScrollLeft`, `canScrollRight`, `needsScrollControls` on resize and scroll (FR-005, FR-010)
- [ ] T009 [P] Unit tests in `frontend/tests/unit/use-horizontal-carousel.test.ts` — mock container/child rects for visible count, forward/backward target index, at-start/at-end flags, and min-step-when-zero-visible case

**Checkpoint**: Hook callable from tests; scroll math and visibility flags pass unit tests.

---

## Phase 3: User Story 1 — Scroll a library row with end buttons (Priority: P1) 🎯 MVP

**Goal**: Replace horizontal scrollbar on `AlbumGroupRow` with gutter scroll buttons that page by fully visible entry count and snap to left edge.

**Independent Test**: Open any overflowing library home row; right button advances one page of visible albums; left button reverses; left hidden at start, right hidden at end; no visible scrollbar.

### Tests for User Story 1

- [ ] T010 [P] [US1] Update `frontend/tests/unit/AlbumGroupRow.test.tsx` — assert `scrollbar-hide` on scroll container, no `overflow-x-auto` scrollbar reliance; right button visible when content overflows; left button absent at start

### Implementation for User Story 1

- [ ] T011 [US1] Refactor layout in `frontend/src/components/albums/AlbumGroupRow.tsx` — three-column flex: left gutter (`w-10`) | scroll container (`flex-1 scrollbar-hide overflow-x-auto`) | right gutter (`w-10`); gutters render only when `needsScrollControls` per `contracts/ui-carousel.md`
- [ ] T012 [US1] Wire `useHorizontalCarousel` in `frontend/src/components/albums/AlbumGroupRow.tsx` — render shadcn `Button` `variant="ghost"` `size="icon"` with `ChevronLeft`/`ChevronRight` from `lucide-react`; hide left when `!canScrollLeft`, hide right when `!canScrollRight` (FR-006, FR-007, FR-013)
- [ ] T013 [US1] Preserve carousel `role="region"`, `aria-label`, and `tabIndex={0}` on scroll container in `frontend/src/components/albums/AlbumGroupRow.tsx`; keep `scroll-smooth` class

**Checkpoint**: Single overflowing row scrolls via buttons with correct hide/show behavior; T010 passes.

---

## Phase 4: User Story 2 — Browse all library group rows consistently (Priority: P1)

**Goal**: Every home row (album cards, artist tiles, Browse All tile) uses the same scroll-button pattern via shared `AlbumGroupRow`.

**Independent Test**: Load library home with two+ overflowing groups; each row shows identical gutter/button pattern and scroll step logic; rows that fit show no buttons.

### Tests for User Story 2

- [ ] T014 [P] [US2] Add test in `frontend/tests/unit/AlbumGroupRow.test.tsx` — render row with mixed-width children (e.g. `w-[160px]` spans + wider tile) and assert scroll step uses fully-visible count regardless of entry type (FR-009)
- [ ] T015 [P] [US2] Add test in `frontend/tests/unit/AlbumGroupRow.test.tsx` — row with all entries fitting in container width renders no gutter buttons (`needsScrollControls` false, FR-008)

### Implementation for User Story 2

- [ ] T016 [US2] Audit `frontend/src/pages/AlbumsHomePage.tsx` — confirm all five groups use `AlbumGroupRow` without per-row scroll overrides; no code changes expected unless a row bypasses the component

**Checkpoint**: All home rows inherit US1 behavior; mixed entry types and non-overflow rows covered by tests.

---

## Phase 5: User Story 3 — Navigate rows without losing existing access paths (Priority: P2)

**Goal**: Touch/trackpad swipe and keyboard access remain viable; scroll buttons are accessible; edge cards stay clickable in gutters layout.

**Independent Test**: Swipe row horizontally — off-screen entries reachable, button visibility updates; tab to buttons and activate with keyboard; screen reader labels present; edge card clicks not blocked by gutters.

### Tests for User Story 3

- [ ] T017 [P] [US3] Add tests in `frontend/tests/unit/AlbumGroupRow.test.tsx` — buttons have `aria-label="Scroll left"` / `"Scroll right"`; buttons are keyboard focusable (FR-011)
- [ ] T018 [P] [US3] Add test in `frontend/tests/unit/use-horizontal-carousel.test.ts` — simulate `scroll` event updates `canScrollLeft`/`canScrollRight` after programmatic `scrollLeft` change (touch/trackpad path, FR-010)

### Implementation for User Story 3

- [ ] T019 [US3] Add `aria-label="Scroll left"` and `aria-label="Scroll right"` to gutter buttons in `frontend/src/components/albums/AlbumGroupRow.tsx`
- [ ] T020 [US3] Verify gutter columns in `frontend/src/components/albums/AlbumGroupRow.tsx` contain only buttons (no card content overlap) — adjust flex/gutter width if cards intrude into gutter hit area (FR-014)

**Checkpoint**: Accessibility and alternate navigation paths verified; no regression on card interactions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full regression pass and manual validation across viewports.

- [ ] T021 Run `cd frontend && npm test` — full frontend suite green
- [ ] T022 Execute manual checklist in `specs/009-library-scroll-buttons/quickstart.md` at typical desktop and 320 px widths for all five home rows
- [ ] T023 [P] Fix any test or implementation gaps found during T022; update `specs/009-library-scroll-buttons/quickstart.md` only if steps diverge from actual UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on US1 (`AlbumGroupRow` must exist with hook wired)
- **User Story 3 (Phase 5)**: Depends on US1; can overlap with US2 tests (different files)
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

```text
Setup → Foundational → US1 (MVP) → US2
                              ↘ US3 (after US1; parallel with US2 tests)
US1 + US2 + US3 → Polish
```

- **US1 (P1)**: Core carousel UX — MVP deliverable
- **US2 (P1)**: Consistency verification — requires US1 component; no separate component fork
- **US3 (P2)**: A11y and alternate paths — extends US1 hook and component

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T009 ∥ T011 blocked until T005–T008; T009 can start once T006–T007 stubs exist
- **Phase 3**: T010 ∥ T011 only after T005–T008; T010 can be written against expected API first (TDD)
- **Phase 4**: T014 ∥ T015 ∥ T016 (T016 is read-only audit)
- **Phase 5**: T017 ∥ T018; T019 ∥ T020 after US1 lands
- **Phase 6**: T023 ∥ T021 if failures documented separately

---

## Parallel Example: User Story 1

```bash
# After Foundational checkpoint, write component tests while implementing layout:
Task T010: "Update frontend/tests/unit/AlbumGroupRow.test.tsx — scrollbar-hide, button visibility"
Task T011: "Refactor layout in frontend/src/components/albums/AlbumGroupRow.tsx — three-column flex"

# Then wire buttons (depends on T011):
Task T012: "Wire useHorizontalCarousel in AlbumGroupRow.tsx"
```

---

## Parallel Example: User Story 2 + User Story 3

```bash
# After US1 checkpoint, parallel test additions:
Task T014: "Mixed-width children scroll step test in AlbumGroupRow.test.tsx"
Task T017: "aria-label tests in AlbumGroupRow.test.tsx"
Task T018: "scroll event state update test in use-horizontal-carousel.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (hook + CSS + hook tests)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Overflowing row scrolls via buttons; manual smoke on library home
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → hook ready
2. US1 → MVP scroll buttons on all rows using `AlbumGroupRow`
3. US2 → consistency tests + home page audit
4. US3 → a11y and swipe/keyboard polish
5. Polish → quickstart validation at 320 px and desktop

### Task Count Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | 3 | — |
| Foundational | 6 | — |
| US1 | 4 | P1 MVP |
| US2 | 3 | P1 |
| US3 | 4 | P2 |
| Polish | 3 | — |
| **Total** | **23** | |

---

## Notes

- No backend or shared-type changes in this feature
- Do not add npm dependencies for scroll behavior (Constitution V)
- `AlbumGroupRow` is the single integration surface — avoid per-group scroll logic in `AlbumsHomePage.tsx`
- Commit after each phase checkpoint
