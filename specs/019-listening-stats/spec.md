# Feature Specification: Listening Stats Dashboard

**Feature Branch**: `019-listening-stats`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "https://linear.app/audiodex/project/listening-stats-aefaca57e411/overview — Last.fm Listening Stats Dashboard: transform the existing text-only Stats page into a visual analytics dashboard. Last.fm is the primary source (history synced locally for rich analytics), Plex is the secondary/fallback. Capture a Last.fm username, sync listening history, and show top artists/albums/tracks, plays-over-time, a listening clock, weekday distribution, and a calendar heatmap across selectable time periods."

## Clarifications

### Session 2026-05-31

- Q: How should listening history stay current (sync trigger model)? → A: Fully automatic only — the system syncs on a schedule with no manual "Sync now" control; the first-time backfill also starts automatically when a username is connected.
- Q: Which time zone interprets play timestamps for the listening clock, weekday, and calendar views? → A: The viewer's local (browser) time zone.
- Q: What response-time target should a period switch / dashboard load meet for a typical synced history? → A: Under 1 second.
- Q: What should the overview's "busiest day" show? → A: Both the specific peak calendar date and the busiest day-of-week.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View a visual listening dashboard (Priority: P1)

A listener opens the Stats page and immediately sees a rich, visual summary of their listening: headline totals, their top artists, albums, and tracks (with artwork), and can switch the time period (last 7 days, 1 month, 3 months, 6 months, 12 months, all time) to re-scope everything on the page.

**Why this priority**: This is the headline value of the feature — turning a text-only page into an at-a-glance visual dashboard. It delivers value even before deep Last.fm history is available, because it can render from whichever data source is present.

**Independent Test**: With listening data available (from either source), load the Stats page, confirm overview totals and three top-10 lists render with artwork, and switching the period selector updates all figures consistently.

**Acceptance Scenarios**:

1. **Given** the user has listening data, **When** they open the Stats page, **Then** they see overview totals (e.g., total plays, unique artists/albums/tracks, average plays per day, busiest calendar date, busiest day-of-week) and Top 10 lists for artists, albums, and tracks.
2. **Given** the dashboard is showing the default period, **When** the user selects a different period (7d / 1mo / 3mo / 6mo / 12mo / All), **Then** every stat, list, and chart on the page updates to reflect only that period.
3. **Given** a top list item has cover/artist artwork available, **When** the list renders, **Then** the artwork is shown alongside the name, play count, and supporting detail (e.g., artist for an album/track).
4. **Given** the data source is Last.fm vs. Plex, **When** the dashboard renders, **Then** a source indicator clearly tells the user which source the figures came from.

---

### User Story 2 - Connect Last.fm and sync listening history (Priority: P2)

A user provides their Last.fm username and connects the account. The system then automatically imports their listening history into the app for local analytics — no manual sync action is required. A first-time import can be large, so it runs in the background with visible progress, and the system keeps history current automatically by periodically pulling only new plays.

**Why this priority**: Last.fm is the primary, richer data source. Connecting unlocks the full depth of the dashboard (history beyond what Plex provides), but the dashboard itself (US1) can function on fallback data first.

**Independent Test**: Enter a Last.fm username in settings and connect, observe the import progress advancing and completing on its own, then confirm the dashboard reflects the imported history and the source indicator shows Last.fm.

**Acceptance Scenarios**:

1. **Given** the user is on Last.fm settings, **When** they enter a username and connect, **Then** the username is saved and a full history backfill begins automatically in the background while the page remains usable.
2. **Given** a connected account, **When** the user views the sync status, **Then** they see progress (e.g., pages/portion imported) during an import and the last-synced time once complete.
3. **Given** a previously completed import, **When** the next scheduled sync runs, **Then** only plays newer than the last sync are imported (no duplicates created), with no manual action required.
4. **Given** the same play would be imported twice, **When** syncing, **Then** it is de-duplicated and counted only once.
5. **Given** the currently-playing track is reported by the source, **When** importing, **Then** it is excluded from completed-play counts.

---

### User Story 3 - Explore listening patterns over time (Priority: P3)

A listener explores how their listening is distributed: a plays-over-time chart, a listening clock by hour of day, a weekday distribution, and a calendar-style heatmap of daily plays — all scoped to the selected period.

**Why this priority**: These pattern visualizations are high-value but secondary to the core overview/top lists. They deepen engagement once the basics are in place.

**Independent Test**: With history available, open the dashboard and confirm each pattern visualization renders for the selected period, with the time-series granularity adapting sensibly to the range length.

**Acceptance Scenarios**:

1. **Given** history for the selected period, **When** the dashboard loads, **Then** a plays-over-time series is shown with a granularity appropriate to the range (finer for short ranges, coarser for long ranges).
2. **Given** history for the selected period, **When** the dashboard loads, **Then** a listening clock shows play counts grouped by hour of day (0–23).
3. **Given** history for the selected period, **When** the dashboard loads, **Then** a weekday distribution shows play counts by day of week.
4. **Given** history for the selected period, **When** the dashboard loads, **Then** a calendar heatmap shows per-day play counts.

---

### User Story 4 - Plex fallback when Last.fm is unavailable (Priority: P4)

A user who has not connected or synced Last.fm still sees meaningful stats on the dashboard, drawn from their existing Plex play data, with a clear indication that Plex is the source and a path to connect Last.fm for richer analytics.

**Why this priority**: Preserves existing value for users without Last.fm and ensures the page is never empty when Plex data exists; it is a graceful-degradation behavior rather than a primary journey.

**Independent Test**: With Last.fm not connected (or no imported history) but Plex data present, open the dashboard and confirm top lists/overview render from Plex with the source indicator showing Plex.

**Acceptance Scenarios**:

1. **Given** Last.fm is not connected or has no imported history, **When** the user opens the dashboard, **Then** available stats are shown from Plex and the source indicator shows Plex.
2. **Given** neither source has data, **When** the user opens the dashboard, **Then** an empty state is shown with a call to action to connect Last.fm.
3. **Given** Last.fm history later becomes available, **When** the user reloads the dashboard, **Then** the figures switch to Last.fm automatically without extra configuration.

---

### Edge Cases

- **Large first-time history**: A user with years of history triggers a backfill — it must run in the background with progress and not block the UI or time out the request.
- **Sync interruption/error**: A sync that fails partway must surface an error state and be resumable/retryable on the next sync without creating duplicates.
- **Period with no data**: Selecting a period that contains no plays shows an empty/zeroed state for that period rather than an error.
- **Missing artwork**: Top list entries without available artwork still render with a sensible placeholder.
- **Missing or sparse timestamps**: Pattern charts handle gaps (days/hours with zero plays) by showing zero rather than omitting buckets.
- **Invalid/unknown Last.fm username**: Connecting or syncing with a username that has no public history surfaces a clear message instead of a silent empty dashboard.
- **Switching periods mid-sync**: The dashboard remains responsive and reflects whatever data is already imported.
- **Time zones**: Hour-of-day, weekday, and daily groupings are computed in the viewer's local time zone so the listening clock and weekday charts reflect the user's wall-clock listening time.

## Requirements *(mandatory)*

### Functional Requirements

#### Dashboard & periods
- **FR-001**: The Stats page MUST present listening statistics as a visual dashboard (overview totals, top lists with artwork, and pattern charts) rather than text-only output.
- **FR-002**: Users MUST be able to select a reporting period from: last 7 days, 1 month, 3 months, 6 months, 12 months, and all time.
- **FR-003**: Changing the selected period MUST re-scope all overview totals, top lists, and charts on the page to that period.
- **FR-004**: The dashboard MUST display a clearly visible indicator of which data source (Last.fm or Plex) the currently shown figures came from.
- **FR-005**: The dashboard MUST provide a control to refresh/re-fetch the displayed statistics.

#### Overview & top lists
- **FR-006**: The dashboard MUST show overview totals including total plays for the selected period and all-time, unique counts of artists/albums/tracks, average plays per day, the busiest calendar date (specific date with the most plays in the period, with its count), and the busiest day-of-week (aggregated across the period).
- **FR-007**: The dashboard MUST show a Top 10 Artists list, a Top 10 Albums list, and a Top 10 Tracks list for the selected period, each with play counts and, where available, artwork and supporting detail (e.g., artist name).

#### Pattern visualizations
- **FR-008**: The dashboard MUST show a plays-over-time series for the selected period, with granularity automatically chosen to suit the range length.
- **FR-009**: The dashboard MUST show a listening clock of play counts grouped by hour of day (0–23).
- **FR-010**: The dashboard MUST show a weekday distribution of play counts by day of week.
- **FR-011**: The dashboard MUST show a calendar-style heatmap of per-day play counts.
- **FR-011a**: Hour-of-day, weekday, and per-day groupings (FR-009–FR-011) MUST be computed in the viewer's local (browser) time zone so the buckets reflect the user's wall-clock listening time.

#### Last.fm connection & sync
- **FR-012**: Users MUST be able to enter and save a Last.fm username for the connected account.
- **FR-013**: The system MUST sync Last.fm listening history automatically without a manual "Sync now" control. A first-time backfill MUST start automatically when a username is connected, and incremental syncs MUST run automatically on a recurring schedule thereafter.
- **FR-014**: The first-time sync MUST import the full available history as a background process that does not block the user interface.
- **FR-015**: Scheduled syncs MUST be incremental, importing only plays newer than the last successful sync.
- **FR-016**: The system MUST de-duplicate imported plays so that the same play is never counted more than once.
- **FR-017**: The system MUST exclude any "now playing" entry from completed-play counts.
- **FR-018**: Users MUST be able to view sync status, including progress during an import and the last-synced time after completion.
- **FR-019**: The system MUST persist imported listening history locally so analytics can be computed without re-fetching from Last.fm on every view.

#### Fallback & empty states
- **FR-020**: When Last.fm is not connected or has no imported history, the system MUST automatically fall back to Plex-derived statistics and indicate Plex as the source.
- **FR-021**: When no data is available from either source, the dashboard MUST show an empty state with a call to action to connect Last.fm.
- **FR-022**: When Last.fm history becomes available, the dashboard MUST prefer Last.fm over Plex without requiring additional user configuration.

#### Reliability
- **FR-023**: A sync that fails partway MUST surface an error state and be retryable on a later sync without creating duplicate plays.
- **FR-024**: Selecting a period that contains no plays MUST show a zeroed/empty result for that period rather than an error.

### Key Entities *(include if feature involves data)*

- **Listening Account**: Represents a user's connection to Last.fm — includes the Last.fm username, last-synced time, total known scrobble/play count, current sync status (idle / syncing / error), and import progress.
- **Play (Scrobble)**: A single recorded listen — includes when it was played, the track, artist, album, optional artwork reference, optional artist/album identifiers, and the originating source (Last.fm or Plex). Plays are uniquely identified to support de-duplication.
- **Listening Overview**: A computed summary for a period — totals, unique counts, averages, busiest calendar date (with count), busiest day-of-week, the three top-10 lists, and the source used.
- **Listening Patterns**: Computed time-distribution data for a period — plays-over-time series, hour-of-day clock, weekday distribution, and daily calendar counts.
- **Top Entry**: A ranked item in a top list — a label (e.g., artist/album/track name), supporting detail, play count, and optional artwork reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the Stats page, a connected user can see their top artists, albums, and tracks and switch among all six time periods without leaving the page.
- **SC-002**: After selecting any period, the dashboard's overview totals, top lists, and charts all reflect that period consistently (no stale figures from the previous period).
- **SC-003**: A first-time Last.fm import starts automatically on connection and completes in the background while the user can continue using the app, and the user can observe sync progress advancing to completion.
- **SC-004**: A scheduled incremental sync after a completed import adds only new plays and never increases counts due to duplicates.
- **SC-005**: A user with Plex data but no Last.fm connection still sees a populated dashboard, with the source clearly indicated as Plex.
- **SC-006**: A user with neither data source sees an empty state guiding them to connect Last.fm, never a blank or error page.
- **SC-007**: For a typical synced history, 90% of period switches and dashboard loads update the visible figures in under 1 second (no full-page reload required).

## Assumptions

- **Last.fm as primary, Plex as fallback**: Last.fm history (imported locally) is the preferred source for analytics; the existing Plex top-stats capability is reused automatically when Last.fm is unavailable. This matches the existing app architecture and was confirmed with the user.
- **Configuration**: A Last.fm API key is supplied via application configuration, and each user's Last.fm username is captured to enable history import. (Confirmed with user.)
- **Local history storage**: Imported plays are stored locally so aggregations can be computed without calling Last.fm on every page view; this also enables richer/longer-range analytics than live API calls alone.
- **Background backfill**: First-time imports may be lengthy for large histories; they run in the background with visible progress and are incremental on subsequent runs.
- **Default period**: A sensible default period (e.g., last 1 month) is selected on first load; the exact default is an implementation detail.
- **Scope boundaries**: This feature covers the Stats page redesign, Last.fm connection/sync, and the listed visualizations. It does not include scrobbling *to* Last.fm, social/friends features, or recommendations.
- **Existing surfaces reused**: The existing Last.fm settings area and the existing Plex top-stats path are extended rather than replaced.
- **Time-zone handling**: Time-of-day groupings use the viewer's local (browser) time zone; stored timestamps remain absolute and are converted at view/aggregation time.
