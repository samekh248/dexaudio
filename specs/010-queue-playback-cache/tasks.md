---
description: "Task list for feature 010 — Queue and Now Playing Persistence"
---

# Tasks: Queue and Now Playing Persistence

**Input**: Design documents from `/specs/010-queue-playback-cache/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/playback-session.yaml](./contracts/playback-session.yaml), [quickstart.md](./quickstart.md)

**Tests**: Included — plan.md requires Vitest unit tests for `playback-session.ts` and extended `playback-queue-store` / player restore-gate behavior.

**Organization**: Tasks grouped by user story (US1–US3). Frontend-only; no backend changes. US1 is MVP (queue restore); US2 adds now-playing position restore without auto-play; US3 covers session clear, corrupt cache, and unavailable tracks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1–US3). Omitted on Setup, Foundational, and Polish tasks.
- Paths are repository-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch verification and test scaffolding before persistence work.

- [X] T001 Verify branch `010-queue-playback-cache` is checked out and `specs/010-queue-playback-cache/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [X] T002 [P] Run `cd frontend && npm test` — confirm green baseline before session persistence changes
- [X] T003 [P] Create `frontend/tests/unit/playback-session.test.ts` with Vitest imports and empty describe blocks for load/save/validate

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Snapshot I/O module, storage key, and validation. **No user story integration until this phase completes.**

**⚠️ CRITICAL**: US1–US3 depend on `playback-session.ts` and `StorageKeys.playbackSession`.

- [X] T004 Add `playbackSession: dexaudio.playback.session` to `StorageKeys` in `frontend/src/lib/local-storage.ts`
- [X] T005 Create `frontend/src/lib/playback-session.ts` — export `PlaybackSessionSnapshot`, `PersistedQueueItem`, `RestoreOutcome`, `loadSnapshot`, `saveSnapshot`, `clearPlaybackSession`, `validateSnapshot` per [data-model.md](./data-model.md) and [contracts/playback-session.yaml](./contracts/playback-session.yaml) (`schemaVersion: 1`, max 200 items, libraryId match)
- [X] T006 Add `setActiveLibraryId(id)` (or equivalent) in `frontend/src/lib/local-storage.ts` that calls `clearPlaybackSession()` when the active library id changes (FR-012)
- [X] T007 [P] Unit tests in `frontend/tests/unit/playback-session.test.ts` — round-trip save/load, library mismatch → cleared, corrupt JSON → `cleared_corrupt`, oversize queue rejected, `currentIndex: null` queue-only snapshot

**Checkpoint**: `loadSnapshot` / `saveSnapshot` / `clearPlaybackSession` pass unit tests in isolation.

---

## Phase 3: User Story 1 — Queue survives app reload (Priority: P1) 🎯 MVP

**Goal**: Ordered queue (including user vs auto items) persists across reload and hydrates into Zustand without manual re-entry.

**Independent Test**: Add 3+ tracks to queue, reload — same tracks in same order; no audio auto-starts.

### Tests for User Story 1

- [X] T008 [P] [US1] Extend `frontend/tests/unit/playback-queue-store.test.ts` — `hydrateFromSnapshot` restores items order and `source`; empty snapshot leaves empty queue

### Implementation for User Story 1

- [X] T009 [US1] Add `hydrateFromSnapshot`, `playbackStarted`, `hydrated` to `frontend/src/stores/playback-queue-store.ts` — apply `items` from snapshot; when `currentIndex === null` set queue-only mode (no current playback UI) per clarification session
- [X] T010 [US1] Subscribe to `usePlaybackQueue` in `frontend/src/stores/playback-queue-store.ts` (or dedicated `initPlaybackPersistence`) — debounced 300 ms `saveSnapshot` on `items` / reorder / remove / add changes (FR-001, FR-005); omit `skippedIndices` (FR-014)
- [X] T011 [US1] Call `hydrateFromSnapshot(loadSnapshot(activeLibraryId))` on app boot in `frontend/src/App.tsx` or store init before `PlayerProvider` mounts (FR-006)

**Checkpoint**: Reload preserves queue order and user/auto distinction; T008 passes; silent on load (no autoplay yet — completed in US2).

---

## Phase 4: User Story 2 — Currently playing context survives reload but audio stays stopped (Priority: P1)

**Goal**: Restore current track index and elapsed position when playback had started; never auto-play on load; resume from position on explicit play.

**Independent Test**: Play track to ~30 s, reload — same track and ~30 s shown, silent until play pressed; play resumes near prior position.

### Tests for User Story 2

- [X] T012 [P] [US2] Add tests in `frontend/tests/unit/playback-queue-store.test.ts` — snapshot with `currentIndex` + `elapsedMs` hydrates index and `playbackStarted`; queue-only `currentIndex: null` does not mark playing
- [X] T013 [P] [US2] Add test in `frontend/tests/unit/playback-session.test.ts` or new `player-restore.test.tsx` — mock `PlayerProvider` effect: when `restorePhase` true, `loadTrack` not called until play (FR-004, SC-003)

### Implementation for User Story 2

- [X] T014 [US2] Update `loadTrack` in `frontend/src/hooks/use-player.ts` to accept `autoplayOnLoad` (default `true` for live play); support `restoredElapsedMs` display in UI before Howl loads
- [X] T015 [US2] Add restore phase to `frontend/src/contexts/player-context.tsx` — skip `loadTrack` effect while restoring; on user `play()`, exit restore phase, `loadTrack` + seek to `elapsedMs` (FR-003, FR-008)
- [X] T016 [US2] Persist `currentIndex` and `elapsedMs` in `saveSnapshot` only when `playbackStarted` is true; throttle position writes every 5 s + on pause/`pagehide` in `frontend/src/hooks/use-player.ts` or persistence subscriber (FR-002, FR-003, FR-005)
- [X] T017 [US2] Set `playbackStarted` true on first user-initiated play / successful `playNow`; ensure mini-player and Now Playing read restored track/position without route change (FR-013)

**Checkpoint**: Reload shows correct track + position, zero auto-audio; explicit play resumes within 2 s tolerance; T012–T013 pass.

---

## Phase 5: User Story 3 — Restored session handles missing or invalid tracks (Priority: P2)

**Goal**: Clear session on sign-out / library change; toast on corrupt cache; unavailable tracks use existing playback error flow.

**Independent Test**: Corrupt localStorage key → toast + empty queue; sign out → cache cleared; play missing track → skip/message.

### Tests for User Story 3

- [X] T018 [P] [US3] Unit test in `frontend/tests/unit/playback-session.test.ts` — `notifyRestoreFailure` or load path triggers toast message string for corrupt snapshot (FR-015)
- [X] T019 [P] [US3] Unit test — `clearPlaybackSession` invoked when `setActiveLibraryId` changes to different id (FR-012)

### Implementation for User Story 3

- [X] T020 [US3] Call `clearPlaybackSession()` from `frontend/src/components/plex-auth/PlexAuthModal.tsx` on `dataWiped` and sign-out/disconnect paths (FR-009)
- [X] T021 [US3] On `RestoreOutcome.cleared_corrupt`, show non-blocking toast via `sonner` in hydrate bootstrap (`frontend/src/App.tsx` or `playback-session.ts` consumer) per [research.md](./research.md) §7 (FR-015)
- [X] T022 [US3] Verify post-restore play of unavailable track surfaces existing error + skip in `frontend/src/pages/NowPlayingPage.tsx` / `use-player` — adjust only if restore path bypasses failure handling (FR-010)

**Checkpoint**: Auth wipe and library change clear cache; corrupt load shows toast; unavailable track behavior unchanged from feature 004.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full regression and manual validation.

- [X] T023 Run `cd frontend && npm test` — full frontend suite green
- [X] T024 Execute manual checklist in `specs/010-queue-playback-cache/quickstart.md` (queue restore, position restore, queue-only, sign-out clear, corrupt cache, no auto-nav)
- [X] T025 [P] Fix any test or implementation gaps found during T024; update `quickstart.md` only if steps diverge from actual UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on US1 (hydrate + persist pipeline exists)
- **User Story 3 (Phase 5)**: Depends on Foundational; can overlap US2 tests (different files) after T005
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

```text
Setup → Foundational → US1 (MVP) → US2
                              ↘ US3 (parallel tests with US2 after T005)
US1 + US2 + US3 → Polish
```

- **US1 (P1)**: Queue persistence — MVP
- **US2 (P1)**: Now-playing restore without autoplay — requires US1 hydrate/persist
- **US3 (P2)**: Session lifecycle and failure paths — uses Foundational `playback-session.ts`

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T007 ∥ T006 after T005
- **Phase 3**: T008 ∥ T009 after T005–T007
- **Phase 4**: T012 ∥ T013; T014 can start after T005 (different file from T010)
- **Phase 5**: T018 ∥ T019 ∥ T020 after T005
- **Phase 6**: T025 ∥ T023 if failures documented separately

---

## Parallel Example: User Story 1

```bash
# After Foundational checkpoint:
Task T008: "Extend playback-queue-store.test.ts — hydrate items order"
Task T009: "Add hydrateFromSnapshot to playback-queue-store.ts"
```

---

## Parallel Example: User Story 2 + User Story 3

```bash
# After US1 checkpoint:
Task T012: "playback-queue-store tests — currentIndex + elapsedMs"
Task T018: "playback-session test — corrupt toast"
Task T014: "use-player.ts autoplayOnLoad param"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (`playback-session.ts`)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Queue survives reload; still no autoplay until US2
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → snapshot module ready
2. US1 → queue restore MVP
3. US2 → position + no-auto-play + resume on explicit play
4. US3 → clear corrupt/auth/library paths
5. Polish → quickstart validation

### Task Count Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | 3 | — |
| Foundational | 4 | — |
| US1 | 4 | P1 MVP |
| US2 | 6 | P1 |
| US3 | 5 | P2 |
| Polish | 3 | — |
| **Total** | **25** | |

---

## Notes

- No backend or shared-type package changes required (reuse existing `Track`)
- Do not add npm dependencies for persistence (Constitution V)
- Do not persist `skippedIndices`, audio blobs, or route state
- `PlayerProvider` restore gate is mandatory for FR-004 — implement in US2 before declaring feature complete
