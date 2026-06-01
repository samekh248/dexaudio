# Research: Listening Stats Dashboard

All Technical Context unknowns resolved below. No outstanding NEEDS CLARIFICATION.

## R1. Sync trigger model (fully automatic)

**Decision**: Two automatic triggers, no manual control:
1. **Backfill on connect** — when `PUT /lastfm/connection` saves a `username`, fire-and-forget a full history backfill (returns immediately; status polled separately).
2. **Scheduled incremental** — a single `setInterval` worker (`workers/lastfm-sync-scheduler.ts`) started in `app.ts` runs an incremental sync every N minutes (default 15 min), guarded so it skips when `syncStatus === 'syncing'` or no username is connected.

**Rationale**: The clarification mandates "fully automatic, syncs on a schedule, no manual Sync now." The app already scrobbles *to* Last.fm continuously, so new plays appear on Last.fm and must be pulled back. A boot-time interval is the most literal "scheduled" implementation and matches the existing fire-and-forget posture (project description: "Runs in background (fire-and-forget after request returns)").

**Alternatives considered**:
- *Manual `POST /stats/sync`*: rejected by clarification (no manual control).
- *Sync-on-overview-request only*: would never update while the Stats page is closed; rejected. (We may still opportunistically kick an incremental sync when `/stats/overview` is hit and `lastSyncedAt` is stale, as a cheap freshness boost, but the interval is the source of truth.)
- *External cron / OS scheduler*: adds operational complexity; rejected for a self-contained app.

## R2. Last.fm read client

**Decision**: New `lastfm-read-client.ts` using `fetch` against `https://ws.audioscrobbler.com/2.0/` with `LASTFM_API_KEY`:
- `user.getRecentTracks` — `user`, `api_key`, `format=json`, `limit=200`, `extended=1` (artist images + loved), `page`, optional `from`/`to` (unix seconds). Skip the entry where `@attr.nowplaying === "true"`.
- `user.getInfo` — read `user.playcount` for `totalScrobbles`.
- Rate limiting: ~250 ms delay between pages; treat HTTP 429 / Last.fm error code 29 as retryable with backoff.

**Rationale**: `getRecentTracks` is the canonical scrobble history endpoint; `extended=1` returns artwork (`image` array) and MBIDs needed for top lists. `from`/`to` cursors enable incremental pulls. JSON format avoids XML parsing (Plex path uses regex XML; Last.fm offers clean JSON).

**Alternatives considered**: `user.getWeeklyArtistChart`/track charts give pre-aggregated data but lose per-play timestamps required for the listening clock/heatmap; rejected. Local aggregation over raw scrobbles is more flexible.

## R3. Local storage & dedupe

**Decision**: New `scrobbles` table with `playedAt timestamptz` (indexed), `track`, `artist`, `album`, `artistMbid`, `albumMbid`, `imageUrl`, `source` enum (`'lastfm' | 'plex'`). Dedupe with a unique constraint on `(playedAt, track, artist)` and batch inserts using `ON CONFLICT DO NOTHING`. Persist sync progress on the `lastfm_accounts` row (`syncedPages`, `totalPages`, `lastSyncedAt`, `totalScrobbles`, `syncStatus`).

**Rationale**: Storing raw plays locally lets all aggregations run as fast indexed SQL (meets <1s goal) without re-fetching Last.fm per view (FR-019). `(playedAt, track, artist)` is Last.fm's effective natural key for a scrobble. `ON CONFLICT DO NOTHING` makes incremental syncs idempotent (FR-016, FR-023 retry-safe).

**Alternatives considered**: Hashing a synthetic id column — unnecessary; the composite unique key is simpler. Storing only aggregates — loses the ability to re-slice by arbitrary period/tz; rejected.

## R4. Time-zone handling (viewer-local bucketing)

**Decision**: Store `playedAt` as absolute `timestamptz` (UTC). The frontend sends its IANA time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`, e.g. `America/Denver`) as a `tz` query param. Server-side SQL buckets with `playedAt AT TIME ZONE :tz`:
- Hour-of-day: `EXTRACT(HOUR FROM played_at AT TIME ZONE :tz)`
- Weekday: `EXTRACT(DOW FROM played_at AT TIME ZONE :tz)`
- Daily/calendar & time-series: `date_trunc('day'|'week'|'month', played_at AT TIME ZONE :tz)`
- Period boundaries (e.g., "7d") computed from `now() AT TIME ZONE :tz`.

Validate `tz` against `Intl.supportedValuesOf('timeZone')` / a Postgres `pg_timezone_names` check; fall back to `UTC` if invalid.

**Rationale**: Honors the clarification (viewer's local time zone) while keeping aggregation server-side and fast. Postgres `AT TIME ZONE` with an IANA name handles DST correctly. Stored timestamps stay absolute so re-slicing in any tz is lossless (per Assumptions).

**Alternatives considered**: Client-side bucketing of raw scrobbles — could transfer tens of thousands of rows and is slow; rejected. Fixed app tz / UTC — rejected by clarification.

## R5. Period & granularity rules

**Decision**: `StatsPeriod = '7d' | '1m' | '3m' | '6m' | '12m' | 'all'`. Lower bound = `now - period` in the viewer tz (`all` = no lower bound). Plays-over-time granularity auto-selected: **day** for `7d|1m|3m`, **week** for `6m`, **month** for `12m|all`. Empty buckets are zero-filled in the service so charts show gaps as zero (Edge Cases).

**Rationale**: Keeps point counts reasonable per range (≤~92 day-points, ~26 week-points, ~N month-points) for snappy rendering and readable charts (FR-008). Zero-filling satisfies "missing/sparse timestamps" edge case.

## R6. Overview metrics

**Decision**: Compute in one round-trip of grouped queries: total plays (period + all-time via separate count), unique artists/albums/tracks (`COUNT(DISTINCT …)`), avg plays/day (total ÷ active-or-elapsed days), **busiest calendar date** (`date_trunc('day' … AT TIME ZONE :tz)` with max count, returns date + count), **busiest weekday** (max of DOW grouping). Top 10 artists/albums/tracks via `GROUP BY … ORDER BY count DESC LIMIT 10`, carrying `imageUrl` (most-recent non-null per group).

**Rationale**: Matches FR-006/FR-007 and the clarified "busiest day = both peak date and weekday." All expressible as indexed SQL aggregations.

## R7. Plex fallback resolution

**Decision**: A request resolves `source` as: **Last.fm** if at least one `scrobbles` row exists (any source), else **Plex** by delegating to the existing `top-stats-service.aggregateTopStats`. Patterns endpoint returns empty/over Plex-less data when on Plex (Plex `viewCount` has no timestamps, so pattern charts show an explanatory empty state under Plex). Response always includes a `source: 'lastfm' | 'plex'` field. Empty state (CTA → settings) only when neither source yields data (FR-020–FR-022, FR-021).

**Rationale**: Reuses existing Plex code untouched; automatic switch needs no config. Plex lacks per-play timestamps, so pattern visualizations are inherently Last.fm-only — surfaced honestly rather than faked.

**Alternatives considered**: Backfilling Plex `viewCount` into `scrobbles` with synthetic timestamps — misleading for the clock/heatmap; rejected.

## R8. Charting library

**Decision**: Add **recharts** and generate the shadcn `chart` wrapper at `frontend/src/components/ui/chart.tsx`. Use `ResponsiveContainer` for responsiveness; provide an accessible text/table summary alongside each chart for WCAG 2.1 AA.

**Rationale**: Explicit "very visual" requirement; recharts is the engine behind shadcn's official chart component, keeping us within sanctioned shadcn/Tailwind patterns (Constitution II). Documented in Complexity Tracking.

**Alternatives considered**: Chart.js (canvas, weaker a11y/SSR, not shadcn-aligned), visx (more boilerplate), hand-rolled SVG (high cost, poor a11y). All rejected.

## R9. Accessibility & PWA

**Decision**: Period selector via shadcn `Tabs`/`Select` (keyboard + ARIA built-in). Each chart wrapped with `role="img"` + `aria-label` summarizing the data, plus an offscreen/expandable data table. Source indicator is a shadcn `Badge` with text (not color-only). Stats queries cached by TanStack Query and SW stale-while-revalidate so the dashboard renders last-known data offline.

**Rationale**: Satisfies Constitution IV (WCAG AA, offline-first, responsive) for data-viz that is otherwise visual-only.

## R10. Migration & config

**Decision**: Generate `backend/drizzle/0011_listening_stats.sql` via `drizzle-kit generate` after editing `schema.ts`. Add `LASTFM_API_KEY: z.string().min(1)` (optional with `.optional()` so non-Last.fm deployments still boot; sync no-ops without it) to `config.ts` envSchema and `backend/.env.example`.

**Rationale**: Follows existing Drizzle workflow (`db:generate`/`db:migrate`) and config pattern. Making the key optional preserves graceful degradation to Plex.
