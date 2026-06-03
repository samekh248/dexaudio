# Tasks: Play Music on Plexamp (Same Network)

**Input**: Design documents from `/specs/024-plexamp-network-playback/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per plan.md (backend unit/integration + frontend unit tests; not mandated by spec FRs).

**Organization**: Tasks grouped by user story. US2 (discovery UI) precedes US1 (remote play) so the output selector exists before end-to-end play validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US4]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch confirmation and shared API types for all routes and client code.

- [x] T001 Confirm feature branch `024-plexamp-network-playback` and review `specs/024-plexamp-network-playback/plan.md`, `contracts/`, and `research.md`
- [x] T002 [P] Add `NetworkPlayerSchema`, `PlayerListResponseSchema`, `PlayerStatusSchema`, `RemotePlayInputSchema`, `RemoteControlInputSchema`, `QueueSyncInputSchema` in `packages/shared-types/src/api/schemas.ts` per `contracts/network-players-api.md` and `contracts/remote-playback-control.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend Plex client/remote/playqueue services and route registration—all user stories depend on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [P] Implement `fetchNetworkPlayers()` (PMS `GET /clients`, music filter, exclude DexAudio self) in `backend/src/services/plex/plex-clients-service.ts`
- [x] T004 [P] Implement `parsePlayerStatus()` from client/PMS status XML in `backend/src/services/plex/plex-player-status-service.ts`
- [x] T005 [P] Implement `playMedia`, transport commands, and `stopPlayback` in `backend/src/services/plex/plex-remote-service.ts` per `research.md`
- [x] T006 [P] Implement create/update Play Queue helpers in `backend/src/services/plex/plex-playqueue-service.ts` with degraded `playMedia`-only fallback flag
- [x] T007 Register `plex-players` routes module in `backend/src/api/routes/plex-players.ts` and wire into Fastify app bootstrap (same pattern as `plex.ts`)
- [x] T008 [P] Unit tests for client filtering and play queue URI building in `backend/tests/unit/plex-clients-service.test.ts`, `backend/tests/unit/plex-playqueue-service.test.ts`, and `backend/tests/unit/plex-remote-service.test.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 2 — Discover Plex music players on the network (Priority: P1)

**Goal**: Output selector lists **This device** plus all eligible Plex music players within 10 seconds, with refresh and empty-state help.

**Independent Test**: Plex connected, Plexamp (or Plex Web) on LAN with remote control on → open output selector → see named players with product labels; Refresh updates list; no players → only **This device** + help text.

### Tests for User Story 2

- [x] T009 [P] [US2] Integration test for `GET /api/v1/plex/players` with mocked PMS `/clients` XML in `backend/tests/integration/plex-players.test.ts`
- [x] T010 [P] [US2] Unit tests for `playback-output-store` preference read/write in `frontend/tests/unit/playback-output-store.test.ts`

### Implementation for User Story 2

- [x] T011 [P] [US2] Add `StorageKeys.playbackOutput` and export `PlaybackOutputPreference` type usage in `frontend/src/lib/local-storage.ts`
- [x] T012 [US2] Implement Zustand `playback-output-store.ts` (`local` | `network`, persist, `selectLocal`, `selectNetwork`) in `frontend/src/lib/playback-output-store.ts`
- [x] T013 [P] [US2] Add `getPlexPlayers(refresh?)` to `frontend/src/services/api-client.ts`
- [x] T014 [US2] Implement `GET /plex/players` handler using `plex-clients-service` in `backend/src/api/routes/plex-players.ts`
- [x] T015 [US2] Build `PlaybackOutputSelector.tsx` (radiogroup, refresh, empty help) per `contracts/playback-output-ui.md` in `frontend/src/components/playback/PlaybackOutputSelector.tsx`
- [x] T016 [US2] Embed selector in `frontend/src/pages/NowPlayingPage.tsx` toolbar

**Checkpoint**: User Story 2 — discovery and output selection UI work independently of remote play.

---

## Phase 4: User Story 1 — Choose a network player as where music plays (Priority: P1) 🎯 MVP

**Goal**: Play, pause, skip, and queue advance on the selected network player; switching to **This device** stops remote playback within 2 seconds.

**Independent Test**: Select a network player, play a track → audio on remote device, not browser; pause/next work; 3-track queue auto-advances; switch to **This device** → remote stops, browser play works.

### Tests for User Story 1

- [x] T017 [P] [US1] Extend `backend/tests/integration/plex-players.test.ts` for `POST .../play`, `POST .../control`, and `POST .../switch-away`
- [x] T018 [P] [US1] Unit tests for remote orchestrator play/switch/stop paths in `frontend/tests/unit/network-playback-orchestrator.test.ts`

### Implementation for User Story 1

- [x] T019 [US1] Implement `POST /plex/players/{clientId}/play`, `POST .../control`, and `POST .../switch-away` in `backend/src/api/routes/plex-players.ts` per `contracts/remote-playback-control.md`
- [x] T020 [US1] Add `playOnNetworkPlayer`, `controlNetworkPlayer`, and `switchAwayFromNetworkPlayer` to `frontend/src/services/api-client.ts`
- [x] T021 [US1] Implement `network-playback-orchestrator.ts` (play current track, transport, stop on local switch) in `frontend/src/lib/network-playback-orchestrator.ts`
- [x] T022 [US1] Branch `use-player.ts` to skip Howler `loadTrack`/autoplay when `playback-output-store` is `network` and delegate to orchestrator in `frontend/src/hooks/use-player.ts`
- [x] T023 [US1] Register remote bridge in `frontend/src/contexts/player-context.tsx` (orchestrator instead of Howler load when network output)
- [x] T024 [US1] Subscribe `playback-queue-store` changes → debounced `PUT /plex/players/{clientId}/queue` with `queueRevision` in `frontend/src/lib/network-playback-orchestrator.ts`
- [x] T025 [US1] Implement `PUT .../queue` route and degraded-mode `200 { degraded }` response in `backend/src/api/routes/plex-players.ts`
- [x] T026 [US1] Surface queue sync / player errors via toast per `contracts/playback-output-ui.md` from orchestrator failures

**Checkpoint**: User Story 1 — end-to-end remote playback and queue mirror (MVP).

---

## Phase 5: User Story 3 — Now Playing stays in sync with the network player (Priority: P2)

**Goal**: Now Playing metadata, play/pause state, elapsed time, and queue highlight match the remote player within 5 seconds, including changes made on the device.

**Independent Test**: Remote output active → play 30s → UI matches remote; pause on Plexamp → DexAudio shows paused within 5s; skip on device → queue highlight updates.

### Tests for User Story 3

- [x] T027 [P] [US3] Unit tests for status poll mapping to machine/queue state in `frontend/tests/unit/network-playback-orchestrator.test.ts` (extend file)

### Implementation for User Story 3

- [x] T028 [US3] Implement `GET /plex/players/{clientId}/status` in `backend/src/api/routes/plex-players.ts` using `plex-player-status-service.ts`
- [x] T029 [US3] Add `getNetworkPlayerStatus()` to `frontend/src/services/api-client.ts`
- [x] T030 [US3] Poll status every 3s while `mode=network` and update shared playback display state in `frontend/src/lib/network-playback-orchestrator.ts`
- [x] T031 [US3] Bind Now Playing transport UI (play/pause icon, elapsed, active queue row) to polled remote state in `frontend/src/pages/NowPlayingPage.tsx` and/or `frontend/src/hooks/use-player.ts`
- [x] T032 [US3] Disable or hide seek/volume when `supportsSeek` / remote volume unsupported per player capabilities from `GET /plex/players`

**Checkpoint**: User Stories 1–3 — trustworthy Now Playing for remote sessions.

---

## Phase 6: User Story 4 — Remember my preferred output (Priority: P3)

**Goal**: Last selected network player restores on return; offline saved player shows actionable message.

**Independent Test**: Select player, reload app → same selection if reachable; stop player, press play → unavailable message with switch/refresh options.

### Implementation for User Story 4

- [x] T033 [US4] Restore `playback-output-store` from `localStorage` on app init in `frontend/src/lib/playback-output-store.ts` (or root provider mount)
- [x] T034 [US4] Clear `playbackOutput` preference when Plex auth completes with server/account change in existing client wipe path (e.g. `frontend/src/lib/indexed-db.ts` or auth completion handler)
- [x] T035 [US4] On play with saved but unreachable `clientIdentifier`, show FR-010 message with **This device** / refresh affordances in `frontend/src/lib/network-playback-orchestrator.ts`

**Checkpoint**: User Story 4 — persistent output preference and recovery UX.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Plex reporting gate, last.fm on remote, settings copy, edge cases from spec.

- [x] T036 [P] Gate `plex-playback-reporter.ts` `canReport()` when `playback-output-store` is `network` in `frontend/src/lib/plex-playback-reporter.ts`
- [x] T037 [P] Feed `scrobble-tracker.ts` position/duration from remote status poll during network sessions in `frontend/src/lib/scrobble-tracker.ts` (or orchestrator hooks)
- [x] T038 Add Plex Settings footnote “Reporting handled by remote player” when network output active in `frontend/src/components/settings/PlexSettingsSection.tsx`
- [x] T039 [P] Block remote play for pinned cache-only paths when PMS unreachable; offer **This device** in `frontend/src/lib/network-playback-orchestrator.ts`
- [x] T040 Notify when Play Queue sync truncates due to player cap (long queue edge case) in `backend/src/services/plex/plex-playqueue-service.ts` and surface in UI toast
- [x] T041 Run manual steps in `specs/024-plexamp-network-playback/quickstart.md` and fix gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US2 (Phase 3)**: Depends on Foundational — blocks practical US1 UI testing
- **US1 (Phase 4)**: Depends on Foundational + US2 selector (API-level US1 testable after T019 without T015)
- **US3 (Phase 5)**: Depends on US1 remote session
- **US4 (Phase 6)**: Depends on US2 store; can overlap US3
- **Polish (Phase 7)**: Depends on US1 minimum; reporting/scrobble after US1+US3 poll

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US2 | Phase 2 | Selector + `GET /players` |
| US1 | Phase 2, US2 (UI) | Remote play + queue + switch stop |
| US3 | US1 | Poll + Now Playing sync |
| US4 | US2 | Reload + offline message |

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001
- **Phase 2**: T003–T006 and T008 parallel after T002
- **US2**: T009–T011 parallel; T013 parallel with T014
- **US1**: T017–T018 parallel; T019–T020 before T021–T023
- **Polish**: T036–T037 parallel

### Parallel Example: Foundational

```bash
# After T002 completes:
T003 plex-clients-service.ts
T004 plex-player-status-service.ts
T005 plex-remote-service.ts
T006 plex-playqueue-service.ts
T008 unit tests (once services exist)
```

### Parallel Example: User Story 2

```bash
T009 integration test
T010 playback-output-store test
T011 local-storage key
T013 api-client getPlexPlayers
```

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Complete Phase 1–2 (Setup + Foundational)
2. Complete Phase 3 (US2) — output selector
3. Complete Phase 4 (US1) — remote play + queue sync + stop on switch
4. **STOP and VALIDATE** using `quickstart.md` sections 1–4
5. Add US3 → US4 → Polish incrementally

### Incremental Delivery

1. Foundational → US2 → demo discovery
2. US1 → demo remote play (MVP)
3. US3 → demo synced Now Playing
4. US4 + Polish → production-ready

### Suggested MVP Scope

**Phases 1–4** (through T026): discovery, remote play, queue mirror, switch-to-local stop. Defer status poll polish (US3), preference edge messages (US4), and reporting/scrobble polish to later phases.

---

## Notes

- No new PostgreSQL migrations for v1 (`research.md`)
- DexAudio timeline reporting **off** when `mode=network` (clarification + FR-015)
- last.fm **on** for remote sessions (FR-019) — Phase 7
- Commit after each checkpoint; register routes before frontend API calls
