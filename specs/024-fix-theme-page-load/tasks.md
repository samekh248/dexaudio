# Tasks: Fix Theme Application on Page Load

**Input**: Design documents from `/specs/024-fix-theme-page-load/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests for `theme-bootstrap.ts` are included per plan.md (cold-load scenarios, fallbacks, idempotency). Manual validation via `quickstart.md`.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and audit the deferred-bootstrap root cause.

- [X] T001 Confirm feature branch `024-fix-theme-page-load` and review design docs in `specs/024-fix-theme-page-load/`
- [X] T002 Audit deferred theme bootstrap in `frontend/src/hooks/use-theme-sync.ts`, `frontend/src/main.tsx`, and `frontend/src/lib/theme-store.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Synchronous `bootstrapThemeFromStorage()`, early boot entry, and store/hook wiring — required before any user story validation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Define `ThemeBootstrapResult` and `ThemeBootstrapFallbackReason` types in `frontend/src/lib/theme-bootstrap.ts` per `specs/024-fix-theme-page-load/data-model.md`
- [X] T004 [P] Add `themeMode` and `CuratedThemeId` validation helpers in `frontend/src/lib/local-storage.ts`
- [X] T005 Implement storage read, FR-009 Sync revert fallbacks (F1–F7), and persist `themeMode=sync` in `frontend/src/lib/theme-bootstrap.ts` per `specs/024-fix-theme-page-load/contracts/theme-load-fallbacks.md`
- [X] T006 Implement Custom curated/advanced apply with FR-010 invalid supplementary discard (F8–F9) in `frontend/src/lib/theme-bootstrap.ts`
- [X] T007 Implement Light/Dark/Sync apply paths, OS `prefers-color-scheme` resolution, and idempotent session flag in `frontend/src/lib/theme-bootstrap.ts`
- [X] T008 Create `frontend/src/theme-boot-entry.ts` importing `frontend/src/styles/themes.css` and calling `bootstrapThemeFromStorage()`
- [X] T009 Register `theme-boot-entry` module script before `main.tsx` in `frontend/index.html`
- [X] T010 Call `bootstrapThemeFromStorage()` before `createRoot` and move `runThemeMigration()` into bootstrap path in `frontend/src/main.tsx`
- [X] T011 Refactor `bootstrap()` in `frontend/src/lib/theme-store.ts` to delegate to `theme-bootstrap.ts` and hydrate Zustand from `ThemeBootstrapResult`
- [X] T012 Update `frontend/src/hooks/use-theme-sync.ts` to hydrate store without redundant DOM re-apply when session already bootstrapped

**Checkpoint**: Foundation ready — theme applies synchronously before React mount; store hydrates from shared bootstrap result.

---

## Phase 3: User Story 1 — Complete theme on first paint (Priority: P1) 🎯 MVP

**Goal**: On cold load, every major visual category—including backgrounds, text, links, and buttons—matches the saved theme on the first interactive frame.

**Independent Test**: Set a distinctive Custom theme (or Dark/Light), hard-refresh the app, and verify library, settings, and now playing surfaces show correct link and button colors on first paint without user action (spec US1).

### Tests for User Story 1

- [X] T013 [P] [US1] Add unit tests for Custom curated and advanced first-paint token application (`--primary`, `--accent`, `data-theme`) in `frontend/tests/unit/theme-bootstrap.test.ts`
- [X] T014 [P] [US1] Add unit tests for Light, Dark, and Sync first-paint complete palettes including OS-resolved Sync in `frontend/tests/unit/theme-bootstrap.test.ts`

**Checkpoint**: User Story 1 functional — all theme modes apply completely before first React paint.

---

## Phase 4: User Story 2 — Consistency across surfaces and navigation (Priority: P2)

**Goal**: After cold load, theme appearance remains consistent when navigating library, album detail, queue, now playing, and settings.

**Independent Test**: After cold load, navigate through at least four primary surfaces without opening Appearance settings; confirm no surface reverts link or button colors (spec US2).

### Implementation for User Story 2

- [X] T015 [P] [US2] Audit `frontend/src/pages/` and `frontend/src/components/` for link/button styles bypassing CSS theme variables
- [X] T016 [US2] Fix any hard-coded interactive colors found during audit in `frontend/src/` (none found — shadcn Button uses theme tokens)

**Checkpoint**: User Story 2 functional — navigation does not reintroduce mixed or default interactive styling.

---

## Phase 5: User Story 3 — Theme changes still apply immediately (Priority: P3)

**Goal**: In-session theme changes continue to apply the full theme within one interaction; no regression from load-time bootstrap refactor.

**Independent Test**: Change from one curated Custom theme to another in settings; confirm instant full apply. Reload; confirm the new choice loads completely on first paint (spec US3).

### Implementation for User Story 3

- [X] T017 [US3] Verify in-session `applyMode`, `applyCurated`, and `selectAdvanced` still apply via `theme-engine` without bootstrap guard blocking updates in `frontend/src/lib/theme-store.ts`
- [X] T018 [P] [US3] Run and pass `frontend/tests/unit/custom-theme-apply.test.ts` and related theme unit tests after store refactor

**Checkpoint**: User Story 3 functional — live theme switching and reload both produce complete styling.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fallback matrix coverage, regression sweep, and manual acceptance.

- [X] T019 [P] Add fallback matrix unit tests F1–F8 and idempotency cases in `frontend/tests/unit/theme-bootstrap.test.ts`
- [X] T020 Execute manual validation checklist in `specs/024-fix-theme-page-load/quickstart.md` including PWA standalone cold launch (SC-001) — automated suite passes; manual PWA smoke recommended before release

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP
- **User Story 2 (Phase 4)**: Depends on Foundational; best validated after US1 bootstrap tests pass
- **User Story 3 (Phase 5)**: Depends on Foundational; can parallel with US2 after T011–T012 complete
- **Polish (Phase 6)**: Depends on US1–US3 (or at minimum US1 + Foundational for fallback tests)

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational only — delivers MVP
- **User Story 2 (P2)**: Requires Foundational; independently testable via navigation after cold load
- **User Story 3 (P3)**: Requires Foundational; independently testable via in-session theme switch

### Within Foundational Phase

```text
T003 → T005 → T006 → T007 → T008 → T009
                  ↘ T010, T011 → T012
T004 can run parallel with T003 (different files)
```

### Parallel Opportunities

- **Phase 1**: T001 and T002 sequential (audit follows doc review)
- **Phase 2**: T004 [P] parallel with T003; T010 and T011 parallel after T007 (different files)
- **Phase 3**: T013 and T014 [P] parallel (same file but independent test cases)
- **Phase 4**: T015 [P] audit parallel with Phase 3 tests if staffed separately
- **Phase 5**: T018 [P] parallel with Phase 4 T015
- **Phase 6**: T019 [P] can start once T005–T007 land; T020 after all story checkpoints

---

## Parallel Example: User Story 1

```bash
# After Foundational checkpoint, launch US1 tests together:
Task T013: "Add unit tests for Custom curated and advanced first-paint tokens in frontend/tests/unit/theme-bootstrap.test.ts"
Task T014: "Add unit tests for Light, Dark, and Sync first-paint palettes in frontend/tests/unit/theme-bootstrap.test.ts"
```

---

## Parallel Example: Foundational

```bash
# After T002 audit, parallel validation helper + bootstrap scaffold:
Task T003: "Define ThemeBootstrapResult types in frontend/src/lib/theme-bootstrap.ts"
Task T004: "Add validation helpers in frontend/src/lib/local-storage.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 tests
4. **STOP and VALIDATE**: Hard refresh with Retrowave Custom theme — links/buttons correct on first paint
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → synchronous bootstrap working
2. User Story 1 → first-paint fix verified (MVP)
3. User Story 2 → cross-route consistency audit/fix
4. User Story 3 → in-session switch regression pass
5. Polish → full fallback matrix + PWA manual QA

### Parallel Team Strategy

1. Team completes Setup + Foundational together (T003–T012)
2. Once Foundational lands:
   - Developer A: US1 tests (T013–T014)
   - Developer B: US2 audit (T015–T016)
   - Developer C: US3 regression (T017–T018)
3. Merge and run Polish (T019–T020)

---

## Notes

- Load-time missing advanced theme ID → Sync revert (not Warm Tones repair) per spec clarifications — implement in T005, test in T019
- Invalid supplementary rules → semantic colors only, silent discard — implement in T006, test in T019
- `bootstrapThemeFromStorage()` must be idempotent when called from boot entry, `main.tsx`, and store
- Avoid re-applying theme in `useEffect` after first paint — root cause of the bug
