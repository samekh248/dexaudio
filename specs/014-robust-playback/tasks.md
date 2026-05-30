# Tasks: Robust, Reliable Music Playback

**Input**: Design documents from `/specs/014-robust-playback/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — FR-019 requires automated test coverage for the core playback lifecycle.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1], [US2], [US3]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and extend shared types before foundational work.

- [X] T001 Confirm feature branch `014-robust-playback` and review design docs in `specs/014-robust-playback/`
- [X] T002 [P] Add `TransitionStyle` type and `recoverable` field on `PlaybackFailure` in `packages/shared-types/src/api/schemas.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core playback engine seam and policy modules that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Create `recovery-policy.ts` with constants (`maxRetries=3`, `backoffMs`, `stallWindowMs`, `stallDetectMs`) and helper functions in `frontend/src/lib/recovery-policy.ts`
- [X] T004 [P] Create pure `playback-machine.ts` state machine (states, events, transitions per `data-model.md`) in `frontend/src/lib/playback-machine.ts`
- [X] T005 [P] Create `AudioEngine` interface and Howler adapter in `frontend/src/lib/audio-engine.ts` per `contracts/audio-engine.md`
- [X] T006 [P] Create `FakeAudioEngine` test double implementing `AudioEngine` in `frontend/tests/helpers/fake-audio-engine.ts`
- [X] T007 [P] Create reactive `playback-prefs-store.ts` (Zustand + localStorage write-through) in `frontend/src/lib/playback-prefs-store.ts` per `contracts/playback-preferences.md`
- [X] T008 Extend `classifyPlaybackError` with `recoverable` flag and stall classification in `frontend/src/lib/playback-errors.ts`
- [X] T009 [P] Unit tests for recovery policy in `frontend/tests/unit/recovery-policy.test.ts`
- [X] T010 [P] Unit tests for playback state machine transitions in `frontend/tests/unit/playback-machine.test.ts`
- [X] T011 [P] Unit tests for playback prefs store hydration and mutual exclusivity in `frontend/tests/unit/playback-prefs-store.test.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Playback starts and keeps playing reliably (Priority: P1) 🎯 MVP

**Goal**: Pressing play reliably produces continuous audio; transient stalls recover automatically; final failures auto-advance with a notice.

**Independent Test**: Play a track from a fresh session — audio starts within ~2 s and plays to completion. Simulate a brief network stall mid-track — playback resumes without user action. Force a final failure — brief notice appears and player auto-advances.

### Tests for User Story 1

> Write these tests FIRST; ensure they FAIL before implementation.

- [X] T012 [P] [US1] Engine lifecycle tests (load/play/pause/end) using `FakeAudioEngine` in `frontend/tests/unit/use-player.engine.test.ts`
- [X] T013 [P] [US1] Recovery/retry tests (stall → resume, retry exhaustion → failed) in `frontend/tests/unit/use-player.recovery.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Refactor `use-player.ts` to drive `playback-machine` via `AudioEngine` adapter (replace scattered refs with explicit state) in `frontend/src/hooks/use-player.ts`
- [X] T015 [US1] Implement stall detection (position watchdog + native media events via adapter) and `buffering`/`recovering` states in `frontend/src/hooks/use-player.ts`
- [X] T016 [US1] Wire centralized recovery policy (≤3 retries, backoff, ~10 s stall window, wall-clock deltas) into load and mid-playback error paths in `frontend/src/hooks/use-player.ts`
- [X] T017 [US1] Implement ordered TrackSource fallback (cache → live) with recoverable vs terminal error handling in `frontend/src/hooks/use-player.ts`
- [X] T018 [US1] Expose additive `status` field on player surface and preserve existing `usePlayer()` API in `frontend/src/hooks/use-player.ts`
- [X] T019 [US1] Make `player-context.tsx` the single orchestration owner: handle `ended`/`failed` terminal signals with exactly one guarded `advanceQueue()` in `frontend/src/contexts/player-context.tsx`
- [X] T020 [US1] On final failure, show brief non-blocking `aria-live` notice and auto-advance to next playable track (stop at queue exhaustion) in `frontend/src/contexts/player-context.tsx`
- [X] T021 [US1] Remove duplicate error auto-skip effect from `frontend/src/pages/NowPlayingPage.tsx` so advance path is owned solely by `player-context.tsx`
- [X] T022 [US1] Preserve autoplay-blocked handling and restore-gate play flow (`restorePhase`, `initialSeekMs`) in `frontend/src/contexts/player-context.tsx` and `frontend/src/hooks/use-player.ts`

**Checkpoint**: User Story 1 fully functional — reliable start, auto-recovery, graceful final-failure advance.

---

## Phase 4: User Story 2 — Smooth, correct track transitions (Priority: P2)

**Goal**: Transitions land on the correct track with no double-advance; gapless/crossfade/none styles work consistently; previous-button rule is correct; prefs are reactive.

**Independent Test**: Build a queue; let tracks end naturally and spam Next — audio, queue index, and now-playing display stay in agreement. Change transition style in Settings — next transition uses the new style without reload.

### Tests for User Story 2

- [X] T023 [P] [US2] Orchestration tests (natural end advances once, no double-advance, rapid next settles correctly) in `frontend/tests/unit/player-context.orchestration.test.tsx`
- [X] T024 [P] [US2] Crossfade overlap tests (dual-instance fade, natural end + manual skip) in `frontend/tests/unit/use-player.crossfade.test.ts`

### Implementation for User Story 2

- [X] T025 [US2] Fix gapless handoff: promote staged audio then reconcile queue index in one guarded step (eliminate handoff+`next()` race) in `frontend/src/contexts/player-context.tsx`
- [X] T026 [US2] Replace silent staged-preload error suppression with degraded-transition fallback (normal load + no unexplained gap) in `frontend/src/hooks/use-player.ts`
- [X] T027 [US2] Implement true overlapping crossfade (outgoing fade 1→0, incoming fade 0→1) on natural end and manual skip using staged instances in `frontend/src/hooks/use-player.ts`
- [X] T028 [US2] Read transition style from `playback-prefs-store` at transition time (replace one-time `getItem` read) in `frontend/src/hooks/use-player.ts`
- [X] T029 [US2] Implement previous-button rule (>3 s restart current, ≤3 s go to previous) in `frontend/src/hooks/use-playback-controls.ts`
- [X] T030 [US2] Unify next/previous handoff paths for gapless and crossfade styles in `frontend/src/hooks/use-playback-controls.ts`
- [X] T031 [US2] Wire `PlaybackSettingsSection` to write via `playback-prefs-store` setters instead of direct localStorage in `frontend/src/components/settings/PlaybackSettingsSection.tsx`
- [X] T032 [US2] Add `failedIndices` tracking (or equivalent) for queue-exhaustion detection when all remaining tracks fail in `frontend/src/stores/playback-queue-store.ts`

**Checkpoint**: User Stories 1 AND 2 both work independently — correct transitions, no double-advance, reactive prefs.

---

## Phase 5: User Story 3 — Responsive controls and seeking during loading (Priority: P3)

**Goal**: Transport controls stay responsive during loading/buffering; seeking lands accurately on cached and live streams.

**Independent Test**: While a track buffers, toggle pause/play — state stays consistent. Seek to a late position in a long track — audio resumes within ~1 s; Network tab shows `206 Partial Content` for Range request.

### Tests for User Story 3

- [X] T033 [P] [US3] Backend integration tests for Range forwarding and 206 propagation in `backend/tests/integration/stream-range.test.ts`
- [X] T034 [P] [US3] Seek and loading-state control tests (pause/play during load, rapid seek debounce) in `frontend/tests/unit/use-player.engine.test.ts`

### Implementation for User Story 3

- [X] T035 [US3] Forward client `Range` header to upstream Plex and propagate `206`/`Content-Range`/`Content-Length` in `backend/src/api/routes/stream.ts` per `contracts/stream-range-api.md`
- [X] T036 [US3] Preserve existing 200 full-body behavior when no Range or upstream ignores Range in `backend/src/api/routes/stream.ts`
- [X] T037 [US3] Make transport commands (play/pause/seek/volume) accept input in loading/buffering/recovering states and resolve to consistent final state in `frontend/src/hooks/use-player.ts`
- [X] T038 [US3] Debounce rapid successive seeks to settle on last requested position in `frontend/src/hooks/use-player.ts`
- [X] T039 [US3] Surface `buffering`/`recovering` status in player UI loading indicator in `frontend/src/components/player/AudioPlayer.tsx`

**Checkpoint**: All three user stories independently functional — reliable playback, correct transitions, responsive seeking.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Session restore, background-tab robustness, coverage, and manual validation.

- [X] T040 [P] Harden session restore: first-play resumes saved position reliably via restore gate in `frontend/src/contexts/player-context.tsx`
- [X] T041 [P] Use wall-clock delta timing for recovery in background tabs and revalidate position on `visibilitychange` in `frontend/src/hooks/use-player.ts`
- [X] T042 [P] Update existing `use-playback-controls.test.tsx` and `player-restore.test.tsx` for new orchestration and previous-button behavior in `frontend/tests/unit/`
- [X] T043 Run full test suites (`frontend` + `backend`) and fix any regressions
- [X] T044 Validate all scenarios in `specs/014-robust-playback/quickstart.md` manually and note results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T002) — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 orchestration baseline (T019–T021)
- **User Story 3 (Phase 5)**: Depends on Foundational; backend Range (T035) is independent of US1/US2; frontend seek (T037–T038) builds on US1 engine refactor
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Can start after | Depends on other stories |
|-------|-----------------|--------------------------|
| US1 (P1) | Phase 2 complete | None — **MVP** |
| US2 (P2) | Phase 2 + US1 orchestration (T019–T021) | Builds on US1 engine/orchestrator |
| US3 (P3) | Phase 2 | Backend Range parallel with US1/US2; frontend seek needs US1 engine |

### Within Each User Story

- Tests written first and confirmed failing before implementation
- Foundational modules before hook refactor
- Engine/orchestrator before UI wiring
- Story checkpoint before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001
- **Phase 2**: T003–T007 and T009–T011 can run in parallel after T002; T008 after T002
- **Phase 3 tests**: T012 ∥ T013; then T014–T022 mostly sequential on `use-player.ts`
- **Phase 4 tests**: T023 ∥ T024; T031 ∥ T032 parallel with engine work if files differ
- **Phase 5**: T033 (backend) fully parallel with US2 frontend work; T034 after T014
- **Phase 6**: T040 ∥ T041 ∥ T042

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (after Phase 2):
Task T012: "Engine lifecycle tests in frontend/tests/unit/use-player.engine.test.ts"
Task T013: "Recovery/retry tests in frontend/tests/unit/use-player.recovery.test.ts"

# After T014 engine refactor lands, orchestration tasks can proceed:
Task T019: "Single orchestration owner in frontend/src/contexts/player-context.tsx"
Task T021: "Remove duplicate auto-skip in frontend/src/pages/NowPlayingPage.tsx"
```

## Parallel Example: User Story 3 (backend decoupled)

```bash
# Backend Range work can start as soon as Phase 2 is done — no US2 dependency:
Task T033: "stream-range.test.ts"
Task T035: "Range forwarding in backend/src/api/routes/stream.ts"
Task T036: "200 fallback when upstream ignores Range"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T011) — **CRITICAL**
3. Complete Phase 3: User Story 1 (T012–T022)
4. **STOP and VALIDATE** against US1 independent test criteria
5. Demo/deploy if ready — core reliability problem addressed

### Incremental Delivery

1. Setup + Foundational → engine seam ready
2. Add US1 → reliable playback + recovery → **MVP**
3. Add US2 → correct transitions + crossfade → quality upgrade
4. Add US3 → seeking + responsive controls → full spec coverage
5. Polish → restore, background tabs, quickstart sign-off

### Parallel Team Strategy

With multiple developers after Phase 2:

- **Developer A**: US1 engine + orchestration (T012–T022)
- **Developer B**: US3 backend Range (T033, T035–T036) — can start immediately
- **Developer C**: US2 prefs store UI wiring (T031) + tests (T023–T024) after US1 T019 lands

---

## Notes

- No new runtime dependencies (Constitution V) — reuse Howler, Zustand, existing test stack
- Preserve public `usePlayer()` / `usePlaybackControls()` surfaces; changes are behavioral
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
