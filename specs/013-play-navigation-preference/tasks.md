# Tasks: Play Navigation Preference

**Input**: Design documents from `/specs/013-play-navigation-preference/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/playback-preferences.yaml, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Unit test updates are included where existing suites would regress (`use-play-album.test.tsx`); new hook tests are optional polish.

**Organization**: Tasks grouped by user story. US1 (Settings control) and US2 (hook behavior) are both P1 and together form the MVP. US3 (continue browsing / header access) is primarily verification. Foundational storage blocks all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shadcn/ui Radio Group component required for the Settings control.

- [X] T001 Add shadcn `radio-group` component to `frontend/src/components/ui/radio-group.tsx` via `npx shadcn@latest add radio-group` from the `frontend/` directory

**Checkpoint**: Radio Group available for Playback settings UI.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Client preference storage and read helper — MUST complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `StorageKeys.playNavigation` (`dexaudio.playback.playNavigation`), export type `PlayNavigationMode` (`"navigate" | "stay"`), and `getPlayNavigationMode()` with invalid/missing fallback to `"navigate"` in `frontend/src/lib/local-storage.ts`
- [X] T003 [P] Add code comment in `frontend/src/lib/local-storage.ts` referencing `specs/013-play-navigation-preference/contracts/playback-preferences.yaml` for key and invariants

**Checkpoint**: Preference readable synchronously; default `"navigate"` preserves current behavior.

---

## Phase 3: User Story 1 — Choose whether play actions change the page (Priority: P1) 🎯 MVP (part 1)

**Goal**: Settings → Playback exposes **Go to Now Playing** vs **Stay on current page**; choice persists across reload; default is **Go to Now Playing**.

**Independent Test**: Open Settings → Playback, change preference, reload — selection persists. Default shows **Go to Now Playing** on first visit.

### Implementation for User Story 1

- [X] T004 [US1] Add **When starting playback** fieldset with `RadioGroup`, two labeled options, and per-option helper descriptions in `frontend/src/components/settings/PlaybackSettingsSection.tsx`
- [X] T005 [US1] Wire `useState` initialized from `getPlayNavigationMode()`, persist via `setItem(StorageKeys.playNavigation, mode)` on change, and satisfy FR-008 (`aria-labelledby` / `aria-describedby` on the group) in `frontend/src/components/settings/PlaybackSettingsSection.tsx`

**Checkpoint**: SC-003 and SC-004 satisfied for the Settings control. Playback navigation unchanged until US2.

---

## Phase 4: User Story 2 — Play-now actions respect the preference (Priority: P1) 🎯 MVP (part 2)

**Goal**: `usePlayNow` navigates to `/now-playing` only when mode is `"navigate"`; stay mode skips navigation; playback always starts; no toast in stay mode (FR-009).

**Independent Test**: Set **Stay on current page** — play track, album, and artist; route unchanged, audio plays. Set **Go to Now Playing** — same actions navigate to `/now-playing`. Add to queue never navigates.

### Implementation for User Story 2

- [X] T006 [US2] Read `getPlayNavigationMode()` in `frontend/src/hooks/use-play-now.ts` and call `navigate("/now-playing")` only when mode is `"navigate"` after `playNow(tracks)`
- [X] T007 [US2] Ensure `frontend/src/hooks/use-play-now.ts` does not import or invoke `toast` (FR-009 — stay mode has no supplemental notification)
- [X] T008 [P] [US2] Update `frontend/tests/unit/use-play-album.test.tsx` to mock `getPlayNavigationMode` returning `"navigate"` so existing navigate assertion remains valid

**Checkpoint**: SC-001, SC-002, SC-005 satisfied. All current `usePlayNow` callers (album, artist, track) inherit behavior automatically.

---

## Phase 5: User Story 3 — Browsing continues while music plays (Priority: P2)

**Goal**: Stay mode does not trap users; header Now Playing link still works; session restore never auto-navigates.

**Independent Test**: Enable **Stay on current page**, start playback from library, click header **Now Playing** — navigates without stopping playback. Reload with active session — no forced navigation to `/now-playing`.

### Implementation for User Story 3

- [X] T009 [US3] Audit add-to-queue paths (`frontend/src/pages/AlbumDetailPage.tsx`, `frontend/src/components/library/TrackRow.tsx` consumers) confirm they call `addToQueue` only and never `usePlayNow` for queue-append actions (FR-006)
- [X] T010 [US3] Confirm `frontend/src/lib/playback-bootstrap.ts` and `frontend/src/components/layout/AppShell.tsx` require no changes for FR-007 and FR-010 (header link and session restore stay independent of `playNavigation`)

**Checkpoint**: US3 acceptance scenarios pass via manual smoke; no accidental navigation from restore or add-to-queue.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression coverage and quickstart validation.

- [X] T011 [P] Add `frontend/tests/unit/use-play-now.test.tsx` covering `navigate` mode calls `navigate("/now-playing")`, `stay` mode does not, and invalid preference falls back to navigate
- [X] T012 Run manual smoke test per `specs/013-play-navigation-preference/quickstart.md` (including reload session-restore check FR-010 and header link FR-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (Radio Group needed for US1 UI only; storage can technically start in parallel with T001)
- **US1 (Phase 3)**: Depends on Phase 1 + Phase 2
- **US2 (Phase 4)**: Depends on Phase 2; can proceed in parallel with US1 after T002 (different files)
- **US3 (Phase 5)**: Depends on US2 (needs hook behavior to validate end-to-end)
- **Polish (Phase 6)**: Depends on US2 minimum; full validation after US3

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3
- **User Story 2 (P1)**: After Foundational — delivers MVP behavior with or without US1 UI (testable via localStorage)
- **User Story 3 (P2)**: After US2 — verification-heavy; no new product surface

### Parallel Opportunities

- **T003** ∥ **T004** after T002 (comment vs Settings UI start — T004 needs T001)
- **US1 (T004–T005)** ∥ **US2 (T006–T007)** after T002 (different files: `PlaybackSettingsSection.tsx` vs `use-play-now.ts`)
- **T008** ∥ **T011** after T006 (different test files)
- **T009** ∥ **T010** (audit vs bootstrap/AppShell review)

### Parallel Example: After Phase 2

```bash
# Developer A — Settings UI
T004: PlaybackSettingsSection.tsx radio group
T005: Persistence and accessibility

# Developer B — Hook behavior
T006: use-play-now.ts conditional navigate
T007: No toast in hook
T008: use-play-album.test.tsx mock update
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T003)
3. Complete Phase 3: US1 Settings control (T004–T005)
4. Complete Phase 4: US2 hook behavior (T006–T008)
5. **STOP and VALIDATE**: quickstart steps 1–6
6. Ship MVP

### Incremental Delivery

1. Setup + Foundational → preference readable
2. US2 only (via localStorage) → play-now respects mode — demo hook behavior
3. US1 → user-facing Settings control
4. US3 + Polish → full spec including header/restore checks

### Suggested MVP Scope

**Phases 1–4 (T001–T008)** — Settings toggle + hook behavior. US3 and polish can follow in the same PR or immediately after.

---

## Notes

- Do **not** modify `frontend/src/stores/playback-queue-store.ts` `playNow` for navigation — routing stays in `use-play-now.ts` per research R-001
- Do **not** add navigation to `frontend/src/lib/playback-bootstrap.ts` (FR-010)
- Future play-now entry points (e.g. search) automatically inherit behavior by calling `usePlayNow` — no per-page tasks required
