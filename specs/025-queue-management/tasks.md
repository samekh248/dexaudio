# Tasks: Queue Management

**Input**: Design documents from `/specs/025-queue-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests included where plan.md lists new test files (display, prep store, reorder guards, orchestrator prep, QueuePanel).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US4]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and shared storage keys before foundational work.

- [X] T001 Verify branch `025-queue-management` is checked out and `specs/025-queue-management/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [X] T002 [P] Add `StorageKeys.queuePrepDepth` in `frontend/src/lib/local-storage.ts` per `contracts/queue-preparation.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure display segmentation, prep status store, and preparation depth preference — required before queue UI and orchestrator extensions.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Implement `buildQueueDisplaySections` and `PLAYED_VISIBLE_MAX` in `frontend/src/lib/queue-display.ts` per `contracts/queue-display.md`
- [X] T004 [P] Unit tests for played window (max 3), separator flag, and not-started queue in `frontend/tests/unit/queue-display.test.ts`
- [X] T005 Implement Zustand `queue-prep-store.ts` (`setTrackPrep`, `clearTrackPrep`, `clearAllExcept`, `useTrackPrep`) per `contracts/queue-preparation.md`
- [X] T006 [P] Unit tests for prep status transitions in `frontend/tests/unit/queue-prep-store.test.ts`
- [X] T007 Extend `playback-prefs-store.ts` with `queuePrepDepth` (clamp 1..5, default 3) and `setQueuePrepDepth` wired to `StorageKeys.queuePrepDepth`
- [X] T008 [P] Extend `playback-prefs-store.test.ts` for queue prep depth default, clamp, and persistence

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — See what already played vs what is coming (Priority: P1) 🎯 MVP

**Goal**: Queue panel shows up to three played tracks above a separator, current + upcoming below; played rows subdued, selectable (re-anchor), no remove/drag.

**Independent Test**: Play through 4+ tracks; open queue — only three tracks before current appear above separator; tap a visible played row — playback re-anchors without rebuild.

### Implementation for User Story 1

- [X] T009 [US1] Refactor `frontend/src/components/queue/QueuePanel.tsx` to render `played` / `current` / `upcoming` sections from `buildQueueDisplaySections`
- [X] T010 [US1] Add visual separator and subdued played-row styling; hide remove and disable drag on played rows in `frontend/src/components/queue/QueuePanel.tsx`
- [X] T011 [US1] Wire `frontend/src/pages/NowPlayingPage.tsx` to pass display input and `onSelect` → `setIndex` for played re-anchor
- [X] T012 [P] [US1] Component tests for played window and separator in `frontend/tests/unit/QueuePanel.test.tsx`

**Checkpoint**: User Story 1 fully functional — played/upcoming split and backward selection.

---

## Phase 4: User Story 2 — Reorder what will play next (Priority: P1)

**Goal**: Drag or keyboard-reorder tracks strictly after current; current row pinned; played rows not draggable.

**Independent Test**: Queue 5 tracks, play track 2, drag track 5 before track 3 — order updates, track 2 keeps playing; current row does not drag.

### Implementation for User Story 2

- [X] T013 [US2] Add `reorderUpcoming(from, to)` with `currentIndex` guards in `frontend/src/stores/playback-queue-store.ts` per `contracts/queue-reorder.md`
- [X] T014 [P] [US2] Unit tests for reorder guards and unchanged `currentIndex` in `frontend/tests/unit/queue-reorder.test.ts`
- [X] T015 [US2] Implement native HTML5 drag-and-drop on upcoming-only rows in `frontend/src/components/queue/QueuePanel.tsx`
- [X] T016 [US2] Add touch long-press drag and keyboard reorder (`Alt+ArrowUp`/`Alt+ArrowDown`) with `aria-live` in `frontend/src/components/queue/QueuePanel.tsx`
- [X] T017 [US2] Wire `onReorderUpcoming` from `frontend/src/pages/NowPlayingPage.tsx` to `reorderUpcoming`

**Checkpoint**: User Stories 1 and 2 — split UI plus upcoming reorder.

---

## Phase 5: User Story 3 — See upcoming tracks getting ready (Priority: P2)

**Goal**: Thin in-row buffer progress on the next track (and other rows when prep started), driven by staged load state.

**Independent Test**: Play with prep depth ≥1; observe next row’s thin bar advance to full before that track becomes current.

### Implementation for User Story 3

- [X] T018 [US3] Replace single `stagedForwardRef` with `forwardByTrackId` map and `disposeStaged` eviction in `frontend/src/hooks/use-player.ts`
- [X] T019 [US3] Wire staged engine `onLoaded`, `onProgress`, and `onError` to `queue-prep-store` in `frontend/src/hooks/use-player.ts`
- [X] T020 [US3] Implement `cancelStagedOutside(keepTrackIds)` and call from queue sync on index/items change in `frontend/src/contexts/player-context.tsx` and `frontend/src/hooks/use-player.ts`
- [X] T021 [US3] Render thin `role="progressbar"` buffer bar on next/upcoming rows using `useTrackPrep` in `frontend/src/components/queue/QueuePanel.tsx`

**Checkpoint**: User Story 3 — visible per-row preparation progress.

---

## Phase 6: User Story 4 — Smooth handoff between tracks (Priority: P2)

**Goal**: Configurable preparation depth (default 3); multi-track forward staging; lossless earlier start; staging when transition is `none`.

**Independent Test**: Set depth to 3 in Settings; play three lossless tracks — transitions ≤500 ms on broadband; change depth to 1 — only next row prepares.

### Implementation for User Story 4

- [X] T022 [US4] Implement `preloadForwardDepth` using `getQueuePrepDepth()` in `frontend/src/lib/playback-orchestrator.ts`
- [X] T023 [US4] Trigger immediate forward staging for `flac`/`alac` within three queue positions on index/items change in `frontend/src/lib/playback-orchestrator.ts`
- [X] T024 [US4] Run forward staging when transition style is `none` (not only gapless/crossfade) in `frontend/src/lib/playback-orchestrator.ts`
- [X] T025 [US4] Add queue preparation depth control (1–5) to `frontend/src/components/settings/PlaybackSettingsSection.tsx`
- [X] T026 [P] [US4] Unit tests for depth scheduling and lossless lead in `frontend/tests/unit/playback-orchestrator.prep.test.ts`

**Checkpoint**: All four user stories independently verifiable per `quickstart.md`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Regression safety, accessibility, and manual validation.

- [X] T027 Run manual scenarios in `specs/025-queue-management/quickstart.md` and fix any gaps
- [X] T028 [P] Accessibility pass: region labels, focus order, and progressbar semantics on `frontend/src/components/queue/QueuePanel.tsx`
- [X] T029 Run `npm test` in `frontend/` for queue, prep, orchestrator, and playback-queue-store regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational (T003–T004)
- **User Story 2 (Phase 4)**: Depends on US1 `QueuePanel` structure (T009–T010); store task T013 can start after Phase 2
- **User Story 3 (Phase 5)**: Depends on Foundational T005–T006 and US1 panel T009
- **User Story 4 (Phase 6)**: Depends on US3 staged pool (T018–T020) and Foundational T007
- **Polish (Phase 7)**: Depends on desired user stories complete

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US1 (P1) | Phase 2 | Played window + separator + re-anchor |
| US2 (P1) | US1 panel + Phase 2 | Upcoming-only drag/keyboard reorder |
| US3 (P2) | Phase 2 + US1 panel | Buffer bar on next/upcoming rows |
| US4 (P2) | US3 staging + Phase 2 prefs | Depth setting + multi-preload + lossless lead |

### Within Each User Story

- Store/lib pure logic before UI wiring
- `QueuePanel` changes serialized per story to avoid merge conflicts
- Orchestrator/player changes after prep store (US3 before US4)

### Parallel Opportunities

- Phase 1: T002 [P]
- Phase 2: T004, T006, T008 [P] after T003/T005/T007 respectively
- US1: T012 [P] after T009–T011
- US2: T014 [P] parallel with T015 once T013 done
- US4: T026 [P] after T022–T024

---

## Parallel Example: Foundational

```bash
# After T003 lands:
Task T004: "Unit tests queue-display in frontend/tests/unit/queue-display.test.ts"

# After T005 lands:
Task T006: "Unit tests queue-prep-store in frontend/tests/unit/queue-prep-store.test.ts"

# After T007 lands:
Task T008: "Extend playback-prefs-store.test.ts"
```

---

## Parallel Example: User Story 2

```bash
# After T013 lands:
Task T014: "Unit tests queue-reorder in frontend/tests/unit/queue-reorder.test.ts"

# While T015–T016 touch QueuePanel, avoid parallel edits to same file.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1–2
2. Complete Phase 3 (US1)
3. **STOP and VALIDATE** per US1 independent test
4. Demo played/upcoming split

### Incremental Delivery

1. Foundation → US1 (MVP UI) → US2 (reorder) → US3 (buffer bars) → US4 (depth + orchestrator)
2. Each checkpoint in `quickstart.md` should pass before the next priority

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3) — delivers the highest-value UX from Linear (played vs upcoming) without drag or prep work.

---

## Notes

- No backend tasks — frontend-only feature
- Do not add `@dnd-kit` (Constitution V) — native DnD only
- `onReorder` prop exists on `QueuePanel` but is unused — replace with `onReorderUpcoming` per contract
- Queue persistence (`010-queue-playback-cache`) must not regress — run T029 after changes
