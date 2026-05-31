# Quickstart: Live Recently Played Updates

**Branch**: `017-live-recently-played`

## Prerequisites

- Feature **015-plex-playback-report** implemented and playback reporting **enabled** (Plex Settings).
- Plex connected with a music library selected.
- Library with enough history that Recently Played row is visible.

## Manual verification

### 1. Home row updates after album change (5 s dwell)

1. Open library home (`/`); note Recently Played order.
2. Play a track from an album **not** in the top row (or ranked lower).
3. Stay on Now Playing (or another page) for **≥ 5 seconds**.
4. Return to library home within **20 seconds** of starting playback.
5. Confirm played album appears / moves up in Recently Played without manual browser refresh.

### 2. Background refresh (not on library page)

1. Open library home; note row.
2. Navigate to Now Playing; play a **different album** for ≥ 5 s.
3. Return to library home.
4. Confirm row already updated or shows subtle loading then updates (no full-page reload).

### 3. Same album / resume — no refresh

1. Play album A track 1 for ≥ 5 s; confirm row updates for album A.
2. Skip to track 2 on **same album**; wait 10 s.
3. Confirm Recently Played row **unchanged** (no refetch spinner).
4. Pause and resume same track; confirm no refetch.

### 4. Rapid skip before 5 s

1. Skip across 3 different albums, **< 5 s each**.
2. Confirm Recently Played does **not** update for each brief stop.
3. Settle on one album for ≥ 5 s.
4. Confirm single update for settled album.

### 5. In-flight cancel

1. Start album B (≥ 5 s to trigger fetch).
2. While row shows loading indicator, skip to album C.
3. Confirm indicator clears and restarts dwell for C; album B result never flashes.

### 6. View all consistency

1. Open `/library/recently-played`.
2. Play new album elsewhere for ≥ 5 s.
3. Confirm list updates with same album inclusion as home row would show (top 20 rules).

### 7. Other groups untouched

1. Open library home; note Recently Added / Hidden Gems cards.
2. Trigger Recently Played refresh (album change ≥ 5 s).
3. Confirm other rows do not show loading spinners or reorder.

### 8. Reporting disabled

1. Disable playback reporting in Plex Settings.
2. Play new album ≥ 5 s.
3. Confirm Recently Played does **not** add the new play until reporting re-enabled.

## Automated tests (after implementation)

```bash
cd frontend && npm test -- recently-played-refresh-coordinator
cd frontend && npm test -- LibraryGroupSection
```

## Key files (planned)

| Area | Path |
|------|------|
| Coordinator | `frontend/src/lib/recently-played-refresh-coordinator.ts` |
| App binding | `frontend/src/hooks/use-recently-played-refresh.ts` |
| Player hook | `frontend/src/hooks/use-player.ts` |
| Home row UI | `frontend/src/components/albums/LibraryGroupSection.tsx` |
| View all | `frontend/src/pages/CategoryAlbumsPage.tsx` |
| Plex reports (dep) | `frontend/src/lib/plex-playback-reporter.ts` |
| Group API (existing) | `GET /api/v1/library/albums/groups/recently-played` |
