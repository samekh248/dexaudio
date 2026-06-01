# Implementation Plan: Listening Stats Dashboard

**Branch**: `019-listening-stats` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-listening-stats/spec.md`

## Summary

Transform the text-only Stats page (`frontend/src/pages/StatsPage.tsx`) into a visual analytics dashboard. **Last.fm is the primary source**: the backend syncs a user's scrobble history into a new local `scrobbles` Postgres table (full backfill on connect + scheduled incremental syncs, **fully automatic, no manual "Sync now"**), and a new aggregation service computes overview totals, three Top 10 lists, and time-distribution patterns via SQL parameterized by period (`7d|1m|3m|6m|12m|all`). **Plex is the automatic fallback** (existing `GET /api/v1/stats/top`) when no local scrobbles exist. The frontend renders overview cards, top lists with artwork, and four charts (plays-over-time, listening clock, weekday, calendar heatmap) using **recharts** wrapped in a shadcn `chart` component. Time-of-day groupings use the **viewer's local time zone**, passed to the backend so SQL buckets with `AT TIME ZONE`.

**New backend tables**: `scrobbles` (+ extended `lastfm_accounts`). **New endpoints**: `GET /stats/overview`, `GET /stats/patterns`, `GET /stats/sync/status`; extended `PUT /lastfm/connection` (adds `username`). **New dependency**: `recharts` (frontend), justified below.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict). Frontend React 19; backend Node.js LTS + Fastify 5. (Unchanged stack.)

**Primary Dependencies**: Backend — Fastify 5, Drizzle ORM 0.38, `pg`, Zod, existing `top-stats-service` (Plex fallback). Frontend — TanStack Query v5, shadcn/ui + Tailwind, lucide-react, **recharts (NEW)** for charts via a shadcn `chart` wrapper.

**Storage**: PostgreSQL. New `scrobbles` table (timestamptz `playedAt` indexed; unique `(playedAt, track, artist)` for dedupe). Extend `lastfm_accounts` with `username`, `lastSyncedAt`, `totalScrobbles`, `syncStatus`, `syncedPages`, `totalPages`. New Drizzle migration in `backend/drizzle/`.

**Testing**: Vitest. Backend unit tests for aggregation SQL helpers (period boundaries, clock/weekday/calendar bucketing in a given tz), sync dedupe/cursor logic, and the Last.fm read client (mocked fetch). Frontend component tests (MSW) for overview cards, top lists, and each chart, mirroring `frontend/tests/unit/stats-page.test.tsx`.

**Target Platform**: Offline-first PWA (evergreen browsers) + Fastify API.

**Project Type**: Web application (`frontend/` + `backend/` + `packages/shared-types`).

**Performance Goals**: Period switch / dashboard load renders in **< 1 second** for a typical synced history (SC-007). Achieved via indexed `playedAt`, SQL `GROUP BY` aggregation, and TanStack Query caching per `(period, tz)` key. Backfill runs in the background and never blocks a request.

**Constraints**: Fully automatic sync — no manual trigger endpoint or button (clarification). Backfill on connect is fire-and-forget; incremental sync runs on a scheduled background interval. Now-playing entries excluded. Dedupe via `ON CONFLICT DO NOTHING`. Local-tz bucketing computed server-side using the IANA tz the client supplies. Respect Last.fm rate limits (small delay between pages).

**Scale/Scope**: Single-user app (one `lastfm_accounts` row, no per-user scoping). Histories can reach tens of thousands of scrobbles. ~2 new backend services (read client, sync, stats aggregation), 1 migration, 3 new endpoints + 1 extended; frontend: StatsPage redesign, ~6 new chart/card components, 1 shadcn chart wrapper, 3 hooks, settings update.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass — React 19, TS strict |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — Fastify 5 on Node LTS |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — new `scrobbles` table in Postgres via Drizzle |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — Tabs/Select/Card/Badge from shadcn; charts via sanctioned shadcn `chart` wrapper |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — recharts documented below |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — new `/api/v1/stats/*` REST endpoints |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — new Zod schemas in `packages/shared-types` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — charts get text/table fallbacks + `aria-label`; period selector keyboard-navigable |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — stats cached via TanStack Query + SW stale-while-revalidate; renders last-cached on offline |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — responsive grid; recharts `ResponsiveContainer` |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ⚠️ recharts added — explicitly requested ("very visual" dashboard); see Complexity Tracking |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass — documented below |

**Post–Phase 1 re-check**: PASS — design keeps the frontend↔backend boundary RESTful, reuses the existing Plex fallback service, adds exactly one charting dependency (requested), and introduces no non-Postgres store. Accessibility handled via per-chart accessible summaries.

## Project Structure

### Documentation (this feature)

```text
specs/019-listening-stats/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── stats-api.yaml    # Phase 1 — OpenAPI for stats + lastfm connection
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
backend/
├── drizzle/
│   └── 0011_listening_stats.sql                      # NEW: scrobbles + lastfm_accounts cols
├── src/
│   ├── lib/
│   │   └── config.ts                                 # MODIFY: add LASTFM_API_KEY to envSchema
│   ├── db/
│   │   └── schema.ts                                 # MODIFY: scrobbles table + lastfmAccounts cols
│   ├── services/lastfm/
│   │   ├── lastfm-read-client.ts                     # NEW: getRecentTracks / getInfo wrappers
│   │   ├── lastfm-sync-service.ts                    # NEW: backfill + incremental + dedupe + progress
│   │   └── listening-stats-service.ts                # NEW: SQL aggregations (overview + patterns)
│   ├── api/routes/
│   │   ├── stats.ts                                  # MODIFY: add /stats/overview, /patterns, /sync/status
│   │   └── lastfm.ts                                 # MODIFY: PUT /lastfm/connection accepts username
│   └── workers/
│       └── lastfm-sync-scheduler.ts                  # NEW: periodic incremental sync (started in app.ts)
└── tests/unit/
    ├── listening-stats-service.test.ts               # NEW
    ├── lastfm-sync-service.test.ts                   # NEW
    └── lastfm-read-client.test.ts                    # NEW

frontend/
├── src/
│   ├── components/
│   │   ├── ui/chart.tsx                              # NEW: shadcn chart wrapper (recharts)
│   │   └── stats/
│   │       ├── TopTenList.tsx                        # MODIFY: artwork + sub + count
│   │       ├── OverviewCards.tsx                     # NEW
│   │       ├── SyncStatusBanner.tsx                  # NEW
│   │       ├── PlaysOverTimeChart.tsx                # NEW
│   │       ├── ListeningClockChart.tsx               # NEW
│   │       ├── WeekdayChart.tsx                      # NEW
│   │       └── CalendarHeatmap.tsx                   # NEW
│   ├── pages/StatsPage.tsx                           # MODIFY: dashboard layout + period selector + source badge
│   ├── hooks/
│   │   ├── use-listening-overview.ts                 # NEW
│   │   ├── use-listening-patterns.ts                 # NEW
│   │   └── use-lastfm-sync.ts                        # NEW (status polling)
│   ├── services/api-client.ts                        # MODIFY: getStatsOverview/getStatsPatterns/getLastfmSyncStatus/saveLastfmConnection
│   └── components/settings/LastfmSettingsSection.tsx # MODIFY: username field + last-synced/progress display
└── tests/unit/
    ├── stats-page.test.tsx                           # MODIFY
    └── stats-charts.test.tsx                         # NEW

packages/shared-types/src/api/schemas.ts             # MODIFY: StatsPeriod, TopEntry, ListeningOverview,
                                                      #          TimeSeriesPoint, ListeningPatterns, LastfmSyncStatus
```

**Structure Decision**: Standard `backend/` + `frontend/` + `packages/shared-types` web-app layout (matches all prior features). Last.fm logic lives under `backend/src/services/lastfm/` alongside the existing scrobble outbox; the periodic sync uses a new `workers/` scheduler started from `app.ts`. The Plex fallback reuses the untouched `top-stats-service`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dependency: `recharts` (+ shadcn `chart` wrapper) | The spec's core value is a "very visual" dashboard (plays-over-time, listening clock, weekday, calendar heatmap). recharts is the library shadcn's official `chart` component is built on, keeping it within sanctioned shadcn patterns. | Hand-rolling SVG charts would be far more code, less accessible, and harder to maintain; no existing dependency provides charting. Dependency was explicitly requested in the feature description. |
| New background scheduler (`workers/lastfm-sync-scheduler.ts`) | Clarification mandates fully automatic syncing with no manual control; a periodic incremental sync needs a timer started at app boot. | Manual endpoint rejected by clarification; pure sync-on-request would skip updates when the Stats page isn't open. Kept minimal (single `setInterval`, guarded by `syncStatus`). |

## Phase 0 & Phase 1 Artifacts

| Artifact | Status |
|----------|--------|
| [research.md](./research.md) | ✅ Complete |
| [data-model.md](./data-model.md) | ✅ Complete |
| [contracts/stats-api.yaml](./contracts/stats-api.yaml) | ✅ Complete |
| [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Notes (for `/speckit-tasks`)

1. **Foundation**: Add `LASTFM_API_KEY` to `config.ts` envSchema + `backend/.env.example`. Extend `schema.ts` (scrobbles table + `lastfm_accounts` columns) and generate migration `0011_listening_stats.sql`. Add shared Zod schemas/types.
2. **P2 sync pipeline (US2)**: `lastfm-read-client.ts` (`user.getRecentTracks` paginated `limit=200 extended=1 from/to`, `user.getInfo`); `lastfm-sync-service.ts` (full backfill with page progress; incremental from `lastSyncedAt`; dedupe via `ON CONFLICT DO NOTHING`; skip now-playing; update `syncStatus`/`lastError`). Trigger backfill fire-and-forget from `PUT /lastfm/connection` when a username is set; `lastfm-sync-scheduler.ts` runs incremental on an interval.
3. **P1 dashboard (US1)**: `listening-stats-service.ts` — overview (totals period+all-time, unique counts, avg/day, busiest calendar date, busiest weekday) and 3 Top 10 lists; fallback to Plex `top-stats-service` (flag `source:"plex"`). Routes `GET /stats/overview?period=&tz=`. Frontend: `OverviewCards`, extended `TopTenList` (artwork), period selector (shadcn Tabs/Select), source badge, refresh; hooks + api-client.
4. **P3 patterns (US3)**: aggregation for plays-over-time (granularity auto: day ≤3m, week 6m, month 12m/all via `date_trunc … AT TIME ZONE`), hour-of-day clock, weekday, daily calendar; route `GET /stats/patterns?period=&granularity=&tz=`. Frontend charts via recharts + shadcn `chart`.
5. **P4 fallback/empty (US4)**: source resolution (Last.fm if scrobbles exist else Plex); `EmptyState` CTA → Last.fm settings when neither has data.
6. **Settings (US2)**: `LastfmSettingsSection` — username field, last-synced/progress display via `use-lastfm-sync` polling `GET /stats/sync/status`.
7. **Tests**: per service/component above; assert dedupe, tz bucketing, period boundaries, fallback flag, empty/zero states.

**Out of scope**: scrobbling *to* Last.fm (existing outbox unchanged), social/friends, recommendations, manual sync controls.
