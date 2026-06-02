# Tasks: Persist Theme Preference

**Input**: Design documents from `/specs/023-persist-theme-preference/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests included per plan.md (Vitest in `frontend/tests/unit/`). Manual validation via `quickstart.md`.

**Organization**: Tasks grouped by user story. Core hydration is foundational (blocks all stories); story phases add targeted tests and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and audit existing theme boot/persistence code.

- [X] T001 Confirm feature branch `023-persist-theme-preference` and review design docs in `specs/023-persist-theme-preference/`
- [X] T002 Audit current theme boot path in `frontend/src/main.tsx`, `frontend/src/hooks/use-theme-sync.ts`, `frontend/src/lib/theme-store.ts`, and `frontend/src/lib/local-storage.ts` against `contracts/appearance-preference.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Synchronous hydration, shared reconciliation, and invalid-reference recovery — required before any user story is verifiable.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `isValidThemeMode()` (and optional `parseThemeMode()` fallback to `"sync"`) in `frontend/src/lib/local-storage.ts` per data-model rules P1
- [X] T004 Implement `reconcileAppearancePreference()` returning effective `themeMode`, `customSelection`, and `repaired` flag per `data-model.md` rules P1–P3 in `frontend/src/lib/theme-hydration.ts`
- [X] T005 Implement `hydrateThemeFromStorage()` that reconciles, applies DOM via `theme-engine.ts`, and persists storage repairs in `frontend/src/lib/theme-hydration.ts`
- [X] T006 Invoke `hydrateThemeFromStorage()` immediately after `runThemeMigration()` and before `createRoot` in `frontend/src/main.tsx`
- [X] T007 Refactor `theme-store.bootstrap()` to use shared reconcile/hydrate logic without conflicting DOM state in `frontend/src/lib/theme-store.ts`
- [X] T008 Update `deleteAdvanced` so deleting the **active** advanced theme calls sync mode (`applyMode("sync")`) instead of auto-selecting `nextThemes[0]` in `frontend/src/lib/theme-store.ts`
- [X] T009 Remove invalid `resolveCustomSelection` fallbacks (`themes[0]`, forced Warm Tones) in favor of reconcile → sync repair in `frontend/src/lib/theme-store.ts`

**Checkpoint**: Cold load applies persisted theme before React paint; invalid advanced reference repairs to sync; active-theme delete switches to sync.

---

## Phase 3: User Story 1 — Theme survives a page refresh (Priority: P1) 🎯 MVP

**Goal**: Hard refresh restores sync, light, dark, curated custom, or advanced custom; deleted active advanced recovers to sync.

**Independent Test**: For each mode in Appearance settings, hard-refresh and confirm matching UI + settings selection per `quickstart.md` § US1.

### Tests for User Story 1

- [X] T010 [P] [US1] Add `theme-hydration.test.ts` covering light, dark, sync, curated, and advanced modes surviving `hydrateThemeFromStorage()` in `frontend/tests/unit/theme-hydration.test.ts`
- [X] T011 [US1] Add unit test: missing advanced id in `customSelection` repairs to `sync` and persists fix in `frontend/tests/unit/theme-hydration.test.ts`
- [X] T012 [US1] Add unit test: `deleteAdvanced` on active theme switches to sync (create `frontend/tests/unit/theme-store.test.ts` if absent)

### Implementation for User Story 1

- [X] T013 [US1] Audit `applyMode`, `applyCurated`, `selectAdvanced`, and import paths in `frontend/src/lib/theme-store.ts` to ensure `StorageKeys.themeMode` and `StorageKeys.customSelection` are written synchronously on every user change (FR-007)

**Checkpoint**: User Story 1 complete — refresh restores all modes; acceptance scenario 6 (deleted active advanced) passes.

---

## Phase 4: User Story 2 — Theme survives a new browsing session (Priority: P2)

**Goal**: Theme preference survives browser restart on the same profile (same `localStorage` semantics as refresh).

**Independent Test**: Set non-default theme, quit browser, reopen app — theme unchanged per `quickstart.md` § US2.

### Tests for User Story 2

- [X] T014 [US2] Add unit test: sequential `hydrateThemeFromStorage()` calls with unchanged `localStorage` produce identical effective mode (session reload simulation) in `frontend/tests/unit/theme-hydration.test.ts`

**Checkpoint**: User Story 2 verified — persistence is durable across reload boundaries, not session-only memory.

---

## Phase 5: User Story 3 — Theme survives an application update (Priority: P3)

**Goal**: Post-migration storage hydrates correctly; corrupt/missing keys fall back to sync without silent wrong-theme reset.

**Independent Test**: Legacy/migrated keys + fresh install behaviors per `quickstart.md` § US3.

### Tests for User Story 3

- [X] T015 [US3] Add unit test: `runThemeMigration()` then `hydrateThemeFromStorage()` preserves migrated custom selection in `frontend/tests/unit/theme-hydration.test.ts` or extend `frontend/tests/unit/theme-migration.test.ts`
- [X] T016 [US3] Add unit test: corrupt/invalid `themeMode` string coerces to `sync` on hydrate in `frontend/tests/unit/theme-hydration.test.ts`

**Checkpoint**: User Story 3 complete — upgrade/migration path and empty-storage default (sync) behave per spec.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression coverage and manual sign-off.

- [X] T017 [P] Extend `frontend/tests/unit/local-storage-theme.test.ts` for `isValidThemeMode` / parsed defaults
- [X] T018 Run full `cd frontend && npm test` and fix any regressions in theme-related unit tests
- [ ] T019 Execute manual checklist in `specs/023-persist-theme-preference/quickstart.md` and note results in PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Stories (Phase 3–5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on US1–US3 (minimum US1 for MVP sign-off)

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3
- **User Story 2 (P2)**: After Foundational — validates same hydration path (lightweight test add-on)
- **User Story 3 (P3)**: After Foundational — migration ordering tests; independent of US2

### Within Each User Story

- Foundational implementation before story tests
- US1 tests before US1 audit task T013 (or parallel if tests written against expected API)

### Parallel Opportunities

- **T010** and **T017** can run in parallel (different test files) after T005 completes
- **T015** and **T016** can run in parallel after Foundational
- US2 and US3 test tasks can run in parallel once `theme-hydration.test.ts` exists (T010)

---

## Parallel Example: User Story 1

```bash
# After T005 (hydrateThemeFromStorage exists), in parallel:
# T010 — mode matrix tests in theme-hydration.test.ts
# T012 — deleteAdvanced → sync in theme-store.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical**)
3. Complete Phase 3: User Story 1 (tests + persistence audit)
4. **STOP and VALIDATE**: `quickstart.md` US1 scenarios
5. Ship/demo if refresh bug is fixed

### Incremental Delivery

1. Foundational → fixes root refresh bug for all modes
2. US1 tests + audit → confidence for P1 acceptance scenarios
3. US2/US3 tests → session + migration edge cases
4. Polish → full suite green + manual quickstart

### Parallel Team Strategy

1. One developer: Foundational (T003–T009)
2. After checkpoint: Developer A — US1 tests (T010–T012); Developer B — US3 migration tests (T015–T016)

---

## Notes

- No new npm dependencies
- Do not add `index.html` inline script unless SC-004 fails manual check after T006
- Multi-tab live `storage` events are **out of scope** (spec defers to reload consistency)
