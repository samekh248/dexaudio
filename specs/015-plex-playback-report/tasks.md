# Tasks: Plex Playback Reporting

**Input**: Design documents from `/specs/015-plex-playback-report/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included for timeline service, integration route, and frontend reporter (aligned with plan.md test file list; not mandated by spec FRs).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1], [US2], [US3]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and extend shared API types before foundational work.

- [X] T001 Confirm feature branch `015-plex-playback-report` and review design docs in `specs/015-plex-playback-report/`
- [X] T002 [P] Add `PlexTimelineInputSchema`, `PlexReportingStatusSchema`, and `plexPlaybackReporting` on `AppSettingsSchema` in `packages/shared-types/src/api/schemas.ts` per `contracts/plex-timeline-api.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Plex client identity, timeline HTTP builder, and settings defaults that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `plex_timeline_outbox` table (payload jsonb, expiresAt, status, retryCount, lastError) in `backend/src/db/schema.ts` and generate migration SQL in `backend/drizzle/`
- [X] T004 [P] Set `PLEX_PRODUCT_NAME` to `DexAudio` in `backend/src/lib/config.ts` (FR-014)
- [X] T005 [P] Implement `reportTimeline()` URL/query builder and Plex `GET /:/timeline` call in `backend/src/services/plex/plex-timeline-service.ts` per `research.md`
- [X] T006 [P] Add default `plexPlaybackReporting: { enabled: true }` in `backend/src/services/settings/settings-repository.ts`
- [X] T007 [P] Unit tests for timeline query params and header product name in `backend/tests/unit/plex-timeline-service.test.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Plex reflects what I am listening to (Priority: P1) 🎯 MVP

**Goal**: When a Plex-sourced track plays in Dexaudio, Plex activity shows the correct track as **DexAudio** with play/pause/skip/stop lifecycle updates within 10 seconds.

**Independent Test**: Connect Plex, play a library track 30+ seconds, confirm track appears in Plex activity/Recently Played as **DexAudio**; pause, resume, and skip update Plex within 15 seconds.

### Tests for User Story 1

- [X] T008 [P] [US1] Unit tests for session key rotation and heartbeat gating in `frontend/tests/unit/plex-playback-reporter.test.ts`
- [X] T009 [P] [US1] Integration tests for `POST /api/v1/plex/timeline` (mock Plex server) in `backend/tests/integration/plex-timeline.test.ts`

### Implementation for User Story 1

- [X] T010 [US1] Implement `plex-playback-reporter.ts` (start/progress/pause/resume/stop, 10s heartbeat, sessionKey per track) in `frontend/src/lib/plex-playback-reporter.ts` per `contracts/plex-timeline-api.md`
- [X] T011 [US1] Add `postPlexTimeline()` to `frontend/src/services/api-client.ts`
- [X] T012 [US1] Wire reporter into play/pause/seek/end/skip paths in `frontend/src/hooks/use-player.ts` alongside `scrobble-tracker.ts`
- [X] T013 [US1] Implement `POST /plex/timeline` (load connection, honor enabled setting, call timeline service) in `backend/src/api/routes/plex.ts`

**Checkpoint**: User Story 1 — Plex sees DexAudio playback lifecycle for connected Plex library plays.

---

## Phase 4: User Story 2 — Non-Plex content is never reported (Priority: P2)

**Goal**: No timeline traffic when Plex is disconnected, reporting is disabled, or the track cannot be mapped to Plex.

**Independent Test**: Disconnect Plex or disable reporting toggle; play audio — Plex shows no new DexAudio activity. Invalid/unmapped track IDs produce no timeline POST.

### Implementation for User Story 2

- [X] T014 [US2] Return `401`/`204` without calling Plex when no valid `plex_connections` row or token in `backend/src/api/routes/plex.ts`
- [X] T015 [US2] Short-circuit reporter when `plexPlaybackReporting.enabled === false` or Plex not connected in `frontend/src/lib/plex-playback-reporter.ts`
- [X] T016 [US2] Skip timeline posts when `Track.id` is empty or not a Plex rating key in `frontend/src/lib/plex-playback-reporter.ts`

**Checkpoint**: User Stories 1 and 2 — reporting only for valid Plex-sourced sessions.

---

## Phase 5: User Story 3 — Reporting survives brief outages (Priority: P3)

**Goal**: Failed timeline deliveries queue for 24h retry; Plex Settings shows pending count, last error, and manual retry.

**Independent Test**: Block Plex briefly during play, restore network, flush queue via retry — play still appears in Plex history. Settings shows pending count while degraded.

### Implementation for User Story 3

- [X] T017 [P] [US3] Implement enqueue, flush, drop-expired, and pending count in `backend/src/services/plex/plex-timeline-outbox.ts`
- [X] T018 [US3] On timeline HTTP failure return `202` and enqueue payload in `backend/src/api/routes/plex.ts`
- [X] T019 [US3] Add `GET /plex/reporting/status` and `POST /plex/reporting/retry` in `backend/src/api/routes/plex.ts`
- [X] T020 [US3] Add `getPlexReportingStatus()` and `retryPlexReporting()` in `frontend/src/services/api-client.ts`
- [X] T021 [US3] Add reporting toggle (Switch), pending count, last error, and Retry button in `frontend/src/components/settings/PlexSettingsSection.tsx` using shadcn/ui

**Checkpoint**: All user stories independently functional — lifecycle, gating, and resilient delivery.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Data reset paths and manual validation.

- [X] T022 [P] Clear `plex_timeline_outbox` on relevant settings reset targets in `backend/src/services/settings/reset-service.ts`
- [X] T023 Run manual verification steps in `specs/015-plex-playback-report/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on US1 route/reporter existing (adds gating)
- **User Story 3 (Phase 5)**: Depends on US1 `POST /plex/timeline` (adds outbox + UI)
- **Polish (Phase 6)**: Depends on US3 completion

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no dependency on US2/US3
- **US2 (P2)**: After US1 — tightens guards on existing paths
- **US3 (P3)**: After US1 — extends delivery; UI can ship after T013

### Within Each User Story

- Tests before or alongside implementation (same phase)
- Backend service before routes
- Frontend reporter before `use-player` wiring
- Outbox after synchronous timeline path works (US3)

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001
- **Phase 2**: T004, T005, T006, T007 parallel after T003 schema
- **Phase 3**: T008, T009 parallel; T010–T011 parallel before T012
- **Phase 5**: T017 parallel with T019 prep
- **Phase 6**: T022 parallel with other work once outbox exists

---

## Parallel Example: User Story 1

```bash
# Tests in parallel:
# T008 — frontend/tests/unit/plex-playback-reporter.test.ts
# T009 — backend/tests/integration/plex-timeline.test.ts

# Frontend stack in parallel after T010:
# T011 — frontend/src/services/api-client.ts
# (then T012 wires use-player.ts after reporter exists)
```

---

## Parallel Example: Foundational

```bash
# After T003 migration:
# T004 — backend/src/lib/config.ts
# T005 — backend/src/services/plex/plex-timeline-service.ts
# T006 — backend/src/services/settings/settings-repository.ts
# T007 — backend/tests/unit/plex-timeline-service.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational  
3. Complete Phase 3: User Story 1  
4. **STOP and VALIDATE**: Plex activity shows **DexAudio** during play (quickstart §1–3)  
5. Demo if ready  

### Incremental Delivery

1. Setup + Foundational → timeline plumbing ready  
2. US1 → Plex sees live playback (MVP)  
3. US2 → No spurious reports when disconnected/disabled  
4. US3 → Outbox + Settings health + retry  
5. Polish → reset + full quickstart pass  

### Parallel Team Strategy

1. Team completes Setup + Foundational together  
2. Then split:
   - Dev A: US1 backend route + integration test (T009, T013)  
   - Dev B: US1 frontend reporter + use-player (T010–T012)  
3. US2 and US3 sequentially or US2 while US3 dev builds outbox (T017)  

---

## Notes

- `Track.id` is the Plex `ratingKey`; timeline `key` = `/library/metadata/{id}`  
- Heartbeat interval: **10 s** while `playing` (research.md)  
- Do not block playback on timeline failures (FR-012)  
- Last.fm scrobble code paths remain unchanged  

---

## Task Summary

| Metric | Value |
|--------|--------|
| **Total tasks** | 23 |
| **US1** | 6 implementation + 2 test |
| **US2** | 3 |
| **US3** | 5 |
| **Setup + Foundational + Polish** | 7 |
| **MVP scope** | Phases 1–3 (T001–T013) |
