# Tasks: Listening Stats Dashboard

**Input**: Design documents from `/specs/019-listening-stats/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/stats-api.yaml, quickstart.md

**Tests**: Included — plan.md lists backend unit tests (aggregation, sync, read client) and frontend component tests (MSW).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US4]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, config, and shared API types before schema or services.

- [X] T001 Confirm feature branch `019-listening-stats` and review design docs in `specs/019-listening-stats/`
- [X] T002 [P] Add `LASTFM_API_KEY` (optional) to `backend/src/lib/config.ts` envSchema and document in `backend/.env.example` per research.md R10
- [X] T003 [P] Add `recharts` dependency to `frontend/package.json` and install at workspace root
- [X] T004 [P] Add Zod schemas and exports (`StatsPeriod`, `StatsSource`, `TopEntry`, `ListeningOverview`, `TimeSeriesPoint`, `ListeningPatterns`, `LastfmSyncStatus`, extended `LastfmConnectionInput`) in `packages/shared-types/src/api/schemas.ts` per `data-model.md` and `contracts/stats-api.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, migration, and shared stats helpers used by all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Extend `lastfmAccounts` and add `scrobbles` table with `scrobble_source` / `sync_status` enums in `backend/src/db/schema.ts` per `data-model.md`
- [X] T006 Run `npm run db:generate` in `backend/` to create `backend/drizzle/0011_listening_stats.sql`, then `npm run db:migrate`
- [X] T007 [P] Create period-boundary and IANA `tz` validation helpers (invalid → `UTC`) in `backend/src/services/lastfm/listening-stats-service.ts`
- [X] T008 [P] Implement `resolveStatsSource(db)` (Last.fm if any `scrobbles` row exists, else Plex) in `backend/src/services/lastfm/listening-stats-service.ts` per research.md R7

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — View a visual listening dashboard (Priority: P1) 🎯 MVP

**Goal**: Stats page shows overview totals, three Top 10 lists with artwork, period selector (7d / 1mo / 3mo / 6mo / 12mo / All), source badge, and refresh — scoped to the selected period. Works with Plex data when no local scrobbles exist.

**Independent Test**: With Plex (or seeded scrobbles) data, open Stats, confirm overview + top lists render; switch period and all figures update; source badge matches backend `source` field.

### Tests for User Story 1

- [X] T009 [P] [US1] Unit tests for overview aggregation, busiest calendar date + weekday, Plex fallback mapping, and zeroed empty period in `backend/tests/unit/listening-stats-service.test.ts`
- [X] T010 [P] [US1] Component tests for period switching, overview cards, top lists with artwork, and source badge in `frontend/tests/unit/stats-page.test.tsx`

### Implementation for User Story 1

- [X] T011 [US1] Implement `getListeningOverview(db, { period, tz })` with totals, unique counts, avg/day, busiest date/weekday, and three Top 10 lists in `backend/src/services/lastfm/listening-stats-service.ts`
- [X] T012 [US1] Implement Plex fallback path in overview (delegate to `top-stats-service`, map to `ListeningOverview`, set `source: "plex"`) in `backend/src/services/lastfm/listening-stats-service.ts`
- [X] T013 [US1] Add `GET /stats/overview` with `period` + `tz` query validation in `backend/src/api/routes/stats.ts` per `contracts/stats-api.yaml`
- [X] T014 [P] [US1] Add `getStatsOverview(period, tz)` to `frontend/src/services/api-client.ts`
- [X] T015 [P] [US1] Create `use-listening-overview.ts` hook (TanStack Query key `["stats-overview", period, tz]`) in `frontend/src/hooks/use-listening-overview.ts`
- [X] T016 [P] [US1] Create `OverviewCards.tsx` (totals, busiest date, busiest weekday) in `frontend/src/components/stats/OverviewCards.tsx`
- [X] T017 [P] [US1] Extend `TopTenList.tsx` with optional `imageUrl` and placeholder artwork in `frontend/src/components/stats/TopTenList.tsx`
- [X] T018 [US1] Redesign `StatsPage.tsx`: period selector (shadcn Tabs/Select), source badge, refresh control, overview + three top lists layout in `frontend/src/pages/StatsPage.tsx`

**Checkpoint**: User Story 1 — visual dashboard with period scoping and Plex-backed MVP.

---

## Phase 4: User Story 2 — Connect Last.fm and sync listening history (Priority: P2)

**Goal**: User saves Last.fm username; full backfill starts automatically on connect; scheduled incremental syncs run with no manual control; sync status/progress visible in settings and Stats banner.

**Independent Test**: Enter username in settings, connect, observe backfill progress completing without manual sync; scheduled tick adds only new plays without duplicates.

### Tests for User Story 2

- [X] T019 [P] [US2] Unit tests for `getRecentTracks` / `getInfo` parsing, pagination, now-playing skip, rate-limit delay in `backend/tests/unit/lastfm-read-client.test.ts`
- [X] T020 [P] [US2] Unit tests for backfill progress, incremental cursor, dedupe, error→retry in `backend/tests/unit/lastfm-sync-service.test.ts`

### Implementation for User Story 2

- [X] T021 [P] [US2] Implement `lastfm-read-client.ts` (`user.getRecentTracks`, `user.getInfo`, extended artwork, `from`/`to` cursors) in `backend/src/services/lastfm/lastfm-read-client.ts`
- [X] T022 [US2] Implement `lastfm-sync-service.ts` (full backfill, incremental from `lastSyncedAt`, batch insert `ON CONFLICT DO NOTHING`, `syncStatus`/`syncedPages`/`totalPages` updates) in `backend/src/services/lastfm/lastfm-sync-service.ts`
- [X] T023 [US2] Extend `PUT /lastfm/connection` to accept `username`, persist on `lastfm_accounts`, and fire-and-forget backfill when username is set in `backend/src/api/routes/lastfm.ts`
- [X] T024 [US2] Add `GET /stats/sync/status` returning `LastfmSyncStatus` in `backend/src/api/routes/stats.ts`
- [X] T025 [US2] Create `lastfm-sync-scheduler.ts` (periodic incremental sync, skip when `syncing`) and start it from `backend/src/app.ts` per research.md R1
- [X] T026 [P] [US2] Add `getLastfmSyncStatus` and extend Last.fm connection save in `frontend/src/services/api-client.ts`
- [X] T027 [P] [US2] Create `use-lastfm-sync.ts` polling hook in `frontend/src/hooks/use-lastfm-sync.ts`
- [X] T028 [P] [US2] Create `SyncStatusBanner.tsx` (progress, last synced, error) in `frontend/src/components/stats/SyncStatusBanner.tsx`
- [X] T029 [US2] Update `LastfmSettingsSection.tsx`: username field, connect flow, last-synced/progress display (no manual Sync button) in `frontend/src/components/settings/LastfmSettingsSection.tsx`
- [X] T030 [US2] Mount `SyncStatusBanner` on `StatsPage.tsx` when Last.fm account is connected

**Checkpoint**: User Story 2 — automatic Last.fm history import and visible sync status.

---

## Phase 5: User Story 3 — Explore listening patterns over time (Priority: P3)

**Goal**: Dashboard shows plays-over-time (auto granularity), listening clock (0–23), weekday distribution, and calendar heatmap — all scoped to period and viewer-local `tz`. Last.fm-only when timestamps exist.

**Independent Test**: With synced scrobbles, open Stats and confirm all four charts render; change period and granularity adapts; hour buckets match local wall-clock time.

### Tests for User Story 3

- [X] T031 [P] [US3] Unit tests for time-series granularity selection, zero-filled buckets, clock/weekday/calendar `AT TIME ZONE` bucketing in `backend/tests/unit/listening-stats-service.test.ts`
- [X] T032 [P] [US3] Component tests for chart render + accessible summaries in `frontend/tests/unit/stats-charts.test.tsx`

### Implementation for User Story 3

- [X] T033 [US3] Implement `getListeningPatterns(db, { period, tz, granularity? })` (playsOverTime, clock, weekday, calendar) in `backend/src/services/lastfm/listening-stats-service.ts`
- [X] T034 [US3] Add `GET /stats/patterns` with `period`, `tz`, optional `granularity` in `backend/src/api/routes/stats.ts`
- [X] T035 [P] [US3] Add shadcn `chart.tsx` wrapper (recharts) in `frontend/src/components/ui/chart.tsx`
- [X] T036 [P] [US3] Create `PlaysOverTimeChart.tsx` in `frontend/src/components/stats/PlaysOverTimeChart.tsx`
- [X] T037 [P] [US3] Create `ListeningClockChart.tsx` in `frontend/src/components/stats/ListeningClockChart.tsx`
- [X] T038 [P] [US3] Create `WeekdayChart.tsx` in `frontend/src/components/stats/WeekdayChart.tsx`
- [X] T039 [P] [US3] Create `CalendarHeatmap.tsx` in `frontend/src/components/stats/CalendarHeatmap.tsx`
- [X] T040 [P] [US3] Create `use-listening-patterns.ts` and `getStatsPatterns` in `frontend/src/hooks/use-listening-patterns.ts` and `frontend/src/services/api-client.ts`
- [X] T041 [US3] Integrate pattern charts + pass browser `tz` into `StatsPage.tsx`; show explanatory empty state for patterns when `source === "plex"`

**Checkpoint**: User Story 3 — full pattern visualizations for Last.fm history.

---

## Phase 6: User Story 4 — Plex fallback when Last.fm is unavailable (Priority: P4)

**Goal**: Dashboard never blank when Plex has data; empty state guides connect Last.fm when neither source has data; figures auto-prefer Last.fm once scrobbles exist.

**Independent Test**: Without Last.fm/scrobbles but with Plex plays, Stats shows Plex-sourced overview/lists with Plex badge. With neither source, empty state CTA appears. After sync completes, reload shows Last.fm without extra config.

### Implementation for User Story 4

- [X] T042 [US4] Ensure overview returns zeroed totals (not 500) for empty period and `source: "plex"` when no scrobbles in `backend/src/services/lastfm/listening-stats-service.ts`
- [X] T043 [US4] Replace Stats empty state with Last.fm connect CTA (link to settings) when neither source has data in `frontend/src/pages/StatsPage.tsx`
- [X] T044 [US4] Invalidate/refetch overview on sync completion so dashboard switches from Plex to Last.fm automatically in `frontend/src/hooks/use-lastfm-sync.ts` and `StatsPage.tsx`
- [X] T045 [P] [US4] Add unit test cases for Plex-only overview, neither-source empty, and post-sync source flip in `backend/tests/unit/listening-stats-service.test.ts` and `frontend/tests/unit/stats-page.test.tsx`

**Checkpoint**: User Stories 1–4 — graceful degradation and empty-state flows complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, performance, and validation across stories.

- [X] T046 [P] Add `aria-label` / text summaries for each chart component per Constitution IV in `frontend/src/components/stats/`
- [X] T047 [P] Verify TanStack Query cache keys include `period` + `tz` for sub-1s period switches (SC-007) in `frontend/src/hooks/use-listening-overview.ts` and `use-listening-patterns.ts`
- [X] T048 Run `quickstart.md` manual verification checklist and fix any gaps
- [X] T049 Run `npm test` in `backend/` and `frontend/`; ensure all new suites pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T004 schemas before services that import types)
- **US1 (Phase 3)**: Depends on Foundational — **MVP** (Plex fallback works without US2)
- **US2 (Phase 4)**: Depends on Foundational — populates `scrobbles`; unlocks Last.fm-primary dashboard
- **US3 (Phase 5)**: Depends on Foundational; **meaningful charts require US2 data** (Plex has no timestamps)
- **US4 (Phase 6)**: Depends on US1 overview + US2 sync hooks; can overlap late US1/US3 work
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 | Phase 2 | Delivers MVP via Plex fallback without US2 |
| US2 | Phase 2 | Independent of US3/US4; enables Last.fm analytics |
| US3 | Phase 2, US2 (data) | UI can ship early with empty Plex patterns state |
| US4 | US1, US2 (partial) | Mostly wiring empty state + source flip on sync |

### Within Each User Story

- Tests written to fail before implementation (where listed first in phase)
- Shared types → schema → services → routes → frontend hooks → components → page integration

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 in parallel after T001
- **Phase 2**: T007, T008 in parallel after T006
- **US1**: T009–T010 parallel; T014–T017 parallel after T013
- **US2**: T019–T020 parallel; T021 then T022; T026–T028 parallel after routes
- **US3**: T031–T032 parallel; T036–T039 parallel after T035
- **US4**: T045 parallel with other test files
- **Polish**: T046–T047 parallel

---

## Parallel Example: User Story 1

```bash
# Backend tests + frontend tests together:
T009: backend/tests/unit/listening-stats-service.test.ts
T010: frontend/tests/unit/stats-page.test.tsx

# Frontend components after API hook exists:
T016: frontend/src/components/stats/OverviewCards.tsx
T017: frontend/src/components/stats/TopTenList.tsx
```

---

## Parallel Example: User Story 3

```bash
# All chart components after chart wrapper:
T036: PlaysOverTimeChart.tsx
T037: ListeningClockChart.tsx
T038: WeekdayChart.tsx
T039: CalendarHeatmap.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Stats dashboard with Plex data, period switching, source badge
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → schema and helpers ready
2. US1 → Plex-backed visual dashboard (MVP)
3. US2 → Last.fm sync + richer analytics source
4. US3 → Pattern charts
5. US4 → Empty states and automatic source preference
6. Polish → a11y + quickstart validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Then:
   - Developer A: US1 backend + StatsPage core
   - Developer B: US2 sync pipeline + settings
   - Developer C: US3 charts (after T035 chart wrapper)
3. US4 + Polish after core stories merge

---

## Notes

- No `POST /stats/sync` endpoint — sync is fully automatic per clarification (research.md R1)
- `GET /stats/top` remains unchanged; Plex fallback reuses `top-stats-service.ts`
- Commit after each task or logical group; stop at checkpoints to validate each story independently
