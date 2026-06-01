# Tasks: Custom Themes

**Input**: Design documents from `/specs/021-custom-themes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not included — the feature spec does not require automated test coverage. Optional unit tests are listed in the Polish phase; validate manually via `quickstart.md`.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US4]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and review existing Appearance/theming code.

- [X] T001 Confirm feature branch `021-custom-themes` and review design docs in `specs/021-custom-themes/`
- [X] T002 Audit current theming implementation in `frontend/src/components/settings/AppearanceSettingsSection.tsx`, `frontend/src/components/settings/CustomThemeEditor.tsx`, `frontend/src/lib/custom-theme-presets.ts`, `frontend/src/hooks/use-theme-sync.ts`, and `frontend/src/styles/themes.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme engine, persistence model, store, migration, and boot wiring — required before any user story UI.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `CustomSelection`, `CuratedThemeId`, `AdvancedTheme` types; `StorageKeys.customSelection`, `StorageKeys.themeMigrationV1`; `MAX_ADVANCED_THEMES = 6` in `frontend/src/lib/local-storage.ts`
- [X] T004 [P] Define Warm Tones, Retrowave, and Elegant palette maps (six HSL slots each) with display names/descriptions in `frontend/src/lib/curated-themes.ts`
- [X] T005 [P] Implement supplementary-rules sanitizer (16 KB limit, blocklist, allowed selectors) in `frontend/src/lib/theme-supplementary.ts` per `contracts/theme-supplementary-rules.md`
- [X] T006 Implement `applyCurated`, `applyAdvanced`, full CSS variable mapping (`--background` through `--now-playing-highlight`), and supplement inject/remove in `frontend/src/lib/theme-engine.ts`
- [X] T007 Create Zustand `theme-store.ts` with bootstrap, `applyMode`, `applyCurated`, `applyAdvanced`, persistence to `localStorage`, and dirty-draft state in `frontend/src/lib/theme-store.ts`
- [X] T008 Implement legacy preset → nearest curated migration and one-time notice flag in `frontend/src/lib/theme-migration.ts` per `contracts/legacy-migration.md`
- [X] T009 Invoke `runThemeMigration()` before React render in `frontend/src/main.tsx`
- [X] T010 Refactor `useThemeSync` to delegate custom-mode application to `theme-store` bootstrap while preserving sync/light/dark OS listener behavior in `frontend/src/hooks/use-theme-sync.ts`
- [X] T011 [P] Add `[data-theme="custom"]` baseline and document `--now-playing-highlight` usage in `frontend/src/styles/themes.css` (and wire consumers if any component uses hard-coded highlight colors)

**Checkpoint**: Foundation ready — curated/advanced themes can be applied programmatically; migration runs on boot; store is source of truth.

---

## Phase 3: User Story 1 — Choose a curated custom look (Priority: P1) 🎯 MVP

**Goal**: Listeners pick Warm Tones, Retrowave, or Elegant in Custom mode with immediate, persistent application across the app.

**Independent Test**: Switch among the three curated themes in Appearance settings; reload app — last curated choice remains; surfaces match warm light / retro dark / refined light character per `quickstart.md` §1.

### Implementation for User Story 1

- [X] T012 [P] [US1] Create `CuratedThemePicker` (three options with name + short description, selection highlight) in `frontend/src/components/settings/CuratedThemePicker.tsx`
- [X] T013 [US1] Wire Custom mode in `AppearanceSettingsSection.tsx` to `theme-store` (mode buttons + render `CuratedThemePicker`; selecting curated calls `applyCurated` and persists `customSelection`)
- [X] T014 [US1] Seed default `customSelection` to `warm-tones` when entering Custom mode with no prior selection in `frontend/src/lib/theme-store.ts`
- [X] T015 [US1] Remove ad-hoc `document.documentElement.setAttribute` / inline preset logic superseded by the store from `frontend/src/components/settings/AppearanceSettingsSection.tsx`

**Checkpoint**: User Story 1 functional — three curated themes selectable, applied app-wide, persisted across restart.

---

## Phase 4: User Story 2 — Author an advanced custom theme (Priority: P2)

**Goal**: Advanced path with six semantic slots (visual color picker + typed HSL), one supplementary rules textarea, live preview, Reset, and Save.

**Independent Test**: Create/edit advanced theme, change slots via picker and typing, add supplementary rule, Reset/Save, reload — state matches `quickstart.md` §2.

### Implementation for User Story 2

- [X] T016 [P] [US2] Add HSL parse/validate/format helpers and hex↔HSL conversion utilities in `frontend/src/lib/theme-colors.ts`
- [X] T017 [US2] Refactor `CustomThemeEditor.tsx` into advanced editor: six labeled slots (native color input + `Input`), single supplementary `Textarea`, Reset/Save, inline validation errors
- [X] T018 [US2] Wire editor draft to `theme-store` for live preview via `theme-engine.applyAdvanced` on valid changes in `frontend/src/components/settings/CustomThemeEditor.tsx`
- [X] T019 [US2] Show advanced editor when `customSelection.kind === "advanced"` or user chooses create-your-own; ensure at least one default advanced theme exists on first Custom entry in `frontend/src/lib/theme-store.ts`
- [X] T020 [US2] Extend `applyCustomPreset` usages to delegate to `theme-engine` (deprecate or thin-wrap `frontend/src/lib/custom-theme-presets.ts`)

**Checkpoint**: User Story 2 functional — advanced themes editable with live preview and persistence independent of curated picks.

---

## Phase 5: User Story 3 — Share themes via import and export (Priority: P3)

**Goal**: Export/import advanced themes as versioned JSON packages with collision and cap handling.

**Independent Test**: Export advanced theme, delete locally, re-import; invalid file shows error; curated-only active blocks export per `quickstart.md` §5.

### Implementation for User Story 3

- [X] T021 [P] [US3] Implement `ThemePackageV1Schema` (Zod), export blob download, and import parse/validate in `frontend/src/lib/theme-package.ts` per `contracts/theme-package-v1.md`
- [X] T022 [US3] Add Export button (advanced themes only; disabled/hint when curated active) in `frontend/src/components/settings/CustomThemeEditor.tsx` or shared theme actions toolbar
- [X] T023 [US3] Add Import file control with rename/replace/cancel collision dialog and cap-aware net-new blocking in `frontend/src/components/settings/CustomThemeEditor.tsx` (or `AppearanceSettingsSection.tsx`)

**Checkpoint**: User Story 3 functional — round-trip package import/export for advanced themes.

---

## Phase 6: User Story 4 — Manage multiple saved custom themes (Priority: P4)

**Goal**: Up to six advanced themes with switch, duplicate, rename, delete; duplicate curated into advanced; curated always visible and non-deletable.

**Independent Test**: Exercise list actions, hit six-theme cap, duplicate Retrowave, guard last-theme delete per `quickstart.md` §3–§4.

### Implementation for User Story 4

- [X] T024 [US4] Add advanced theme list UI (select active, rename inline/modal) in `frontend/src/components/settings/CustomThemeEditor.tsx` or new `AdvancedThemeList.tsx`
- [X] T025 [US4] Implement duplicate advanced theme (`Copy of …`) with cap check in `frontend/src/lib/theme-store.ts`
- [X] T026 [US4] Implement duplicate curated → new advanced pre-filled palette (`Warm Tones (custom)` naming) with cap check in `frontend/src/lib/theme-store.ts` and UI action on `CuratedThemePicker.tsx`
- [X] T027 [US4] Enforce max-six on create/duplicate/net-new import; allow import-replace when at cap in `frontend/src/lib/theme-store.ts`
- [X] T028 [US4] Block delete of last advanced theme (or auto-seed replacement) and keep three curated entries always visible in `frontend/src/lib/theme-store.ts` and list UI

**Checkpoint**: All four user stories independently functional — full Custom mode management per spec.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Migration UX, regression checks, optional unit tests, manual validation.

- [X] T029 Show one-time Sonner toast after legacy migration with mapped curated name and duplicate hint in `frontend/src/lib/theme-migration.ts`
- [X] T030 [P] Add unsaved-changes guard when leaving Custom editor or switching theme mode (save/discard/cancel) in `frontend/src/components/settings/AppearanceSettingsSection.tsx`
- [X] T031 [P] Optional unit tests: `frontend/tests/unit/theme-engine.test.ts`, `theme-package.test.ts`, `theme-migration.test.ts`, `theme-supplementary.test.ts`
- [X] T032 Run full manual validation walkthrough in `specs/021-custom-themes/quickstart.md` (include Sync/Light/Dark regression and playback-during-import checks)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–6)**: Depend on Foundational completion
  - Recommended sequence: US1 → US2 → US3 → US4 (each builds on store/engine)
  - US3 depends on US2 (exportable advanced theme shape)
  - US4 depends on US1 (duplicate curated) and US2 (advanced list/editor)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Depends on | Can test after |
|-------|------------|----------------|
| **US1 (P1)** | Foundational only | Phase 3 checkpoint |
| **US2 (P2)** | Foundational; soft dependency on US1 for Custom mode entry UX | Phase 4 checkpoint |
| **US3 (P3)** | US2 (advanced theme records) | Phase 5 checkpoint |
| **US4 (P4)** | US1 + US2 + US3 (cap/import interact with list) | Phase 6 checkpoint |

### Within Each User Story

- Foundational libs before UI components
- Store actions before settings UI wiring
- Validation/sanitizer before import/export UI

### Parallel Opportunities

- **Phase 2**: T004, T005, T011 in parallel after T003
- **Phase 3**: T012 parallel with late foundational if store done
- **Phase 4**: T016 parallel before T017–T018
- **Phase 5**: T021 parallel before T022–T023
- **Phase 7**: T030, T031 in parallel

---

## Parallel Example: Foundational

```bash
# After T003 (local-storage types/keys):
Task T004: curated-themes.ts
Task T005: theme-supplementary.ts
Task T011: themes.css

# Then sequential:
Task T006: theme-engine.ts (uses T004, T005)
Task T007: theme-store.ts
```

---

## Parallel Example: User Story 1

```bash
Task T012: CuratedThemePicker.tsx
# Then:
Task T013: AppearanceSettingsSection.tsx (depends on T012 + store)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational (**critical**)  
3. Complete Phase 3: User Story 1  
4. **STOP and VALIDATE**: `quickstart.md` §1  
5. Demo curated themes

### Incremental Delivery

1. Setup + Foundational → engine/store ready  
2. US1 → curated themes (MVP)  
3. US2 → advanced editor  
4. US3 → import/export  
5. US4 → full management + cap  
6. Polish → migration toast, guards, optional tests  

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3): Warm Tones / Retrowave / Elegant selectable in Custom mode with persistence — ~15 tasks (T001–T015).

---

## Notes

- Frontend-only; no `backend/` or `packages/shared-types` changes
- Curated **Elegant** palette: tune against Linear reference image during T004
- FR-013: no contrast warnings on user colors; settings controls still need labels and keyboard support
- Commit after each task or logical group; stop at any checkpoint to validate independently
