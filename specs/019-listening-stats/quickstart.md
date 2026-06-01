# Quickstart: Listening Stats Dashboard

## Prerequisites

- Running PostgreSQL (see `backend/.env` `DATABASE_URL`).
- A Last.fm API key + secret ([create one](https://www.last.fm/api/account/create)). Add to `backend/.env`:
  ```env
  LASTFM_API_KEY=your_lastfm_api_key
  LASTFM_API_SECRET=your_lastfm_api_secret
  ```
  (Optional — without them the dashboard still works via the Plex fallback. The secret is required for the Last.fm sign-in flow.)

## Setup

```bash
# 1. Install (workspace root)
npm install
# adds recharts to frontend

# 2. Apply the DB migration
cd backend
# If this is an existing dev DB (schema already present, no drizzle journal before):
npm run db:baseline    # marks migrations 0000–0010 as applied (run once)
npm run db:migrate     # applies 0011_listening_stats.sql

# Fresh DB only: skip baseline and run db:migrate (applies all migrations in order).
# New migrations after schema edits: npm run db:generate then npm run db:migrate

# 3. Run backend and frontend
npm run dev            # backend (tsx watch, loads .env)
cd ../frontend && npm run dev
```

## Connect Last.fm & sync (automatic)

1. Open **Settings → Last.fm**.
2. Click **Connect with Last.fm**. A Last.fm authorization page opens in a new tab — approve access there.
3. Return to the app; it detects the approval (polling), stores the session key + username automatically, and a full history **backfill starts in the background** — watch the progress/last-synced display in the settings section and the `SyncStatusBanner` on the Stats page. No "Sync now" button exists; incremental syncs run on a schedule thereafter.

## Use the dashboard

1. Open **Stats**.
2. Use the period selector (**7d / 1mo / 3mo / 6mo / 12mo / All**) — overview cards, the three Top 10 lists, and all charts re-scope together.
3. The **source badge** shows Last.fm or Plex. With no Last.fm history, Plex fallback populates the top lists/overview automatically; pattern charts are Last.fm-only.

## Manual verification (maps to acceptance scenarios)

| Check | Expected | Spec ref |
|-------|----------|----------|
| Open Stats with synced history | Overview cards + Top 10 artists/albums/tracks with artwork render | US1 / FR-001, FR-006, FR-007 |
| Switch period | Every stat, list, and chart updates to that period | US1 AS2 / FR-003 |
| Connect a username | Backfill auto-starts; progress advances to completion | US2 AS1 / FR-013, FR-014 |
| Wait for a scheduled tick after backfill | Only new plays added; counts don't double | US2 AS3 / FR-015, FR-016 |
| Inspect listening clock at a known local hour | Play lands in the viewer-local hour bucket | US3 / FR-011a |
| Overview "busiest day" | Shows both peak calendar date (+count) and busiest weekday | FR-006 (clarification) |
| Disconnect / empty Last.fm, with Plex data | Top lists render from Plex; badge says Plex | US4 AS1 / FR-020 |
| No data in either source | Empty state with "connect Last.fm" CTA | US4 AS2 / FR-021 |
| Period with no plays | Zeroed/empty result, not an error | Edge case / FR-024 |
| Period switch timing (typical history) | Updates in < 1 second | SC-007 |

## Tests

```bash
# Backend aggregation + sync + read-client unit tests
cd backend && npm test

# Frontend dashboard + chart component tests (MSW)
cd frontend && npm test
```

Key suites:
- `backend/tests/unit/listening-stats-service.test.ts` — period boundaries, clock/weekday/calendar bucketing in a given tz, busiest date/weekday, top-list ranking, Plex-fallback flag, zero/empty period.
- `backend/tests/unit/lastfm-sync-service.test.ts` — backfill paging/progress, incremental cursor, dedupe (`ON CONFLICT DO NOTHING`), skip now-playing, error→retry.
- `backend/tests/unit/lastfm-read-client.test.ts` — getRecentTracks pagination/extended parsing, getInfo, rate-limit handling (mocked fetch).
- `frontend/tests/unit/stats-page.test.tsx` + `stats-charts.test.tsx` — period switching, source badge, empty state, chart rendering + accessible summaries.
