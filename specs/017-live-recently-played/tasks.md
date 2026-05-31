# Tasks: Live Recently Played Updates

**Input**: Design documents from `/specs/017-live-recently-played/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — plan.md lists coordinator and component unit tests; feature 015 (Plex playback reporting) is a hard prerequisite for meaningful verification.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1], [US2], [US3]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and prerequisite feature before implementation.

- [X] T001 Confirm feature branch `017-live-recently-played` and review design docs in `specs/017-live-recently-played/`
- [X] T002 Confirm feature **015-plex-playback-report** is merged and `frontend/src/lib/plex-playback-reporter.ts` is wired in `frontend/src/hooks/use-player.ts` (hard dependency per plan.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Coordinator module, query-key helper, app binding hook, and unit-test scaffold that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Add `recentlyPlayedGroupQueryKey(libraryId: string)` helper returning `["album-group", "recently-played", libraryId]` prefix in `frontend/src/lib/recently-played-query-keys.ts` per `contracts/ui-recently-played-refresh.md`
- [X] T004 [P] Create coordinator skeleton (`bindRecentlyPlayedRefresh`, `notifyAudibleAlbumChange`, `resetRecentlyPlayedRefresh`, generation token) in `frontend/src/lib/recently-played-refresh-coordinator.ts` per `data-model.md`
- [X] T005 [P] Create `use-recently-played-refresh.ts` hook that binds `QueryClient` + `libraryId` to coordinator in `frontend/src/hooks/use-recently-played-refresh.ts`
- [X] T006 [P] Unit test scaffold with `_resetCoordinatorState()` coverage for idle phase in `frontend/tests/unit/recently-played-refresh-coordinator.test.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Recently Played reflects my current listening session (Priority: P1) 🎯 MVP

**Goal**: After a **different album** plays audibly for **5 seconds**, Recently Played background-refetches app-wide within **15 seconds**; in-flight fetches cancel on album change; resume and same-album track changes do not refresh.

**Independent Test**: Open library home, play a track from a new album for ≥ 5 s on Now Playing, return to `/` — played album appears in Recently Played without manual refresh. Skip same-album tracks and resume — row does not refetch.

### Implementation for User Story 1

- [X] T007 [US1] Implement 5-second dwell timer and phase transitions (`idle → dwelling → fetching`) in `frontend/src/lib/recently-played-refresh-coordinator.ts`
- [X] T008 [US1] Implement targeted `queryClient.refetchQueries` for limits 10 and 20 via `recentlyPlayedGroupQueryKey` in `frontend/src/lib/recently-played-refresh-coordinator.ts`
- [X] T009 [US1] Implement in-flight cancel: clear dwell timer, increment generation, ignore stale fetch results on album change in `frontend/src/lib/recently-played-refresh-coordinator.ts`
- [X] T010 [US1] Wire `notifyAudibleAlbumChange` from audible-play paths in `frontend/src/hooks/use-player.ts` when `track.albumId` differs from last notified album (skip resume and same-album track changes)
- [X] T011 [US1] Mount `useRecentlyPlayedRefresh()` at app root in `frontend/src/App.tsx`
- [X] T012 [P] [US1] Unit tests for dwell completion, skip-before-5s, same-album no-op, and cancel mid-fetch in `frontend/tests/unit/recently-played-refresh-coordinator.test.ts`

**Checkpoint**: User Story 1 — Recently Played updates after album-change dwell; no refresh on resume/same album.

---

## Phase 4: User Story 2 — Plex is the source of truth for play activity (Priority: P1)

**Goal**: Refetch only when Plex reporting is enabled and connected; fetch occurs after 5 s dwell (post track-start timeline report); optional retries within 15 s if Plex lags; no optimistic local ranking.

**Independent Test**: With reporting enabled, play new album ≥ 5 s — Recently Played matches Plex play activity. Disable reporting — new in-app plays do not appear until re-enabled.

### Implementation for User Story 2

- [X] T013 [US2] Gate coordinator scheduling on `refreshPlexReportingGate()` / `plexPlaybackReporting.enabled` and Plex connection in `frontend/src/lib/recently-played-refresh-coordinator.ts`
- [X] T014 [US2] Implement post-dwell retry refetches at ~3 s and ~8 s within 15 s completion window in `frontend/src/lib/recently-played-refresh-coordinator.ts`
- [X] T015 [US2] Skip coordinator notification when `track.albumId` is missing in `frontend/src/hooks/use-player.ts`
- [X] T016 [P] [US2] Unit tests for reporting-disabled no-op and retry scheduling in `frontend/tests/unit/recently-played-refresh-coordinator.test.ts`

**Checkpoint**: User Stories 1 and 2 — live refresh respects Plex reporting gate and retry window.

---

## Phase 5: User Story 3 — Updates do not disrupt browsing (Priority: P2)

**Goal**: Only Recently Played refetches on play events; row keeps previous cards during fetch with subtle loading indicator (`aria-busy`); View all page follows same rules; other library groups untouched.

**Independent Test**: Trigger Recently Played refresh while scrolled to Hidden Gems — other rows do not reload. During fetch, previous cards remain visible with heading-level spinner.

### Implementation for User Story 3

- [X] T017 [P] [US3] Add background-refetch UI for `groupKey === "recently-played"`: keep `data.items` visible, show subtle loading on heading when `isFetching && data`, set `aria-busy` in `frontend/src/components/albums/LibraryGroupSection.tsx`
- [X] T018 [US3] Apply same `isFetching && data` loading pattern on `/library/recently-played` in `frontend/src/pages/CategoryAlbumsPage.tsx`
- [X] T019 [US3] Call `resetRecentlyPlayedRefresh()` when active library changes or on logout in `frontend/src/hooks/use-recently-played-refresh.ts`
- [X] T020 [P] [US3] Unit tests asserting refetch query key does not match `recently-added` / `hidden-gems` keys in `frontend/tests/unit/recently-played-refresh-coordinator.test.ts`
- [X] T021 [P] [US3] Component tests for refetch indicator vs initial skeleton in `frontend/tests/unit/LibraryGroupSection.test.tsx`

**Checkpoint**: All three user stories independently functional — targeted refresh with non-disruptive UI.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup across stories.

- [ ] T022 Run manual verification checklist in `specs/017-live-recently-played/quickstart.md`
- [X] T023 [P] Verify `use-library-home-groups.ts` staleTime behavior still allows explicit refetch (no broad `invalidateQueries(["album-group"])` added) in `frontend/src/hooks/use-library-home-groups.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002 blocks meaningful QA until 015 is present
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on US1 coordinator existing (extends same module)
- **User Story 3 (Phase 5)**: Depends on US1 refetch firing (UI shows `isFetching`); can parallel UI tasks after T008
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational only — delivers core refresh loop
- **User Story 2 (P1)**: Builds on US1 coordinator — independently testable via reporting toggle
- **User Story 3 (P2)**: Builds on US1 refetch — independently testable via UI/isolation assertions

### Within Each User Story

- Coordinator logic before player wiring (US1)
- Reporting gate after base refetch path (US2)
- UI indicators after refetch produces `isFetching` (US3)

### Parallel Opportunities

- **Phase 2**: T003, T004, T005, T006 in parallel
- **Phase 3**: T012 parallel with T010–T011 after T007–T009
- **Phase 5**: T017, T020, T021 in parallel; T018 after T017 pattern established
- **Phase 6**: T023 parallel with T022

---

## Parallel Example: User Story 1

```bash
# After T007–T009 land, in parallel:
Task T012: "Unit tests for dwell/cancel in frontend/tests/unit/recently-played-refresh-coordinator.test.ts"
Task T011: "Mount useRecentlyPlayedRefresh in frontend/src/App.tsx"
```

---

## Parallel Example: User Story 3

```bash
# After US1 refetch works:
Task T017: "LibraryGroupSection background-refetch UI"
Task T020: "Coordinator query-key isolation tests"
Task T021: "LibraryGroupSection component tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm 015 merged)
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Play new album ≥ 5 s → Recently Played updates on library home
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → coordinator scaffold ready
2. User Story 1 → live refresh loop (MVP)
3. User Story 2 → reporting gate + retries
4. User Story 3 → polished non-disruptive UI + View all
5. Polish → quickstart sign-off

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 coordinator + player wiring
   - Developer B: US3 UI (after T008 lands mock/stub refetch)
3. Developer A continues US2 reporting gate after US1 checkpoint

---

## Notes

- Do **not** call `queryClient.invalidateQueries({ queryKey: ["album-group"] })` on playback events — violates FR-006
- 5 s dwell applies to **UI refresh only**; timeline reports still fire at track start (015)
- `[P]` tasks = different files, no incomplete dependencies
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
