# Quickstart: Albums Library View (003-albums-library-view)

**Date**: 2026-05-19
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

This guide describes how to run, test, and validate the albums library view feature locally.

## Prerequisites

- Node.js 22.x LTS, npm 10+
- PostgreSQL 16+ running locally (or via `docker-compose.yml`)
- A working Plex Media Server connection (from the `002-plex-auth-workflow` feature)
- At least one music library indexed by Plex with a mix of:
  - Recently played albums (≥1 scrobble in last 30 days)
  - Rated albums (some ≥3 stars, some <3 stars)
  - Multi-album artists (at least 3 artists with >2 albums)
  - Album titles starting with "The " (for sort verification)

## 1. Apply the database migration

```pwsh
cd backend
npx drizzle-kit migrate
```

Expected: `0009_add_artist_spotlight_state.sql` runs. Verify with:

```sql
\d artist_spotlight_state
```

You should see two columns: `artist_id` (text, PK) and `last_spotlighted_at` (timestamptz, NOT NULL).

## 2. Run the backend

```pwsh
cd backend
npm run dev
```

Smoke-test the new endpoints (replace `<libraryId>` with your Plex section ID, e.g., `1`):

```pwsh
# Curated groups (single call returns all five groups)
curl "http://localhost:3000/api/v1/library/albums/groups?libraryId=<libraryId>" | jq

# Full alphabetical list
curl "http://localhost:3000/api/v1/library/albums/all?libraryId=<libraryId>" | jq '.items | length'
```

Expected shape from `/groups`:
```jsonc
{
  "recentlyPlayed":   [/* up to 5 Album objects */],
  "recentlyAdded":    [/* up to 5 Album objects */],
  "hiddenGems":       [/* up to 5 Album objects, userRating >= 6 */],
  "randomPicks":      [/* exactly 5 Album objects */],
  "artistSpotlights": [/* up to 5 { artistId, artistName, albumCount, albumArtUrls } */]
}
```

## 3. Run the frontend

```pwsh
cd frontend
npm run dev
```

Open `http://localhost:5173/`. You should land on the **new** grouped albums page (replacing the previous flat grid).

## 4. Manual verification matrix

Walk through each user story from the spec:

### Story 1 — Browse curated groups
- [ ] All non-empty groups render in order: Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights.
- [ ] Empty groups (e.g., if you have no scrobbles) do not appear — no headers, no skeletons.
- [ ] Each visible group shows ≤ 5 cards.
- [ ] Random Picks contains 5 album cards + 1 larger "Browse All Albums" tile.

### Story 2 — Hover-to-play
- [ ] Hover an album card: a translucent play button appears over the cover with smooth fade-in.
- [ ] Click the play button: the album starts playing (first track) AND the view switches to `/now-playing` showing the just-started album.
- [ ] Click play on a *different* album from `/now-playing` via the back button → albums view → another card's play: queue replaces, new album plays, view switches back to `/now-playing`.
- [ ] Click play on the *same* album that is already playing: the album restarts from track 1 (timer resets to 0:00) and the view switches to `/now-playing`.

### Story 3 — Click into details
- [ ] Click the album title or cover area outside the play button: the album detail page (`/albums/:id`) opens.
- [ ] Keyboard: Tab into a card → play button is focused first (Enter plays), Tab again → details link is focused (Enter navigates).
- [ ] Back-navigate from album detail to the albums view: scroll position is preserved.

### Story 4 — Artist Spotlight
- [ ] An artist tile shows a stacked-cover visual with up to 3 covers and the artist's name.
- [ ] Activating the tile's play affordance: all albums by that artist play oldest-to-newest, view switches to Now Playing.
- [ ] Activating the tile's details affordance: navigates to `/artists/:artistId`.
- [ ] Reload the page: the 5 artists are *different* (or at least rotated) — verify by inspecting `SELECT artist_id, last_spotlighted_at FROM artist_spotlight_state ORDER BY last_spotlighted_at DESC LIMIT 10;` — the 5 most-recent timestamps should match what you just saw.

### Story 5 — Browse All Albums
- [ ] Click the "Browse All Albums" tile → `/albums/all` opens.
- [ ] Scroll: no UI stutter even with a large library.
- [ ] Albums starting with "The " sort by the second word: e.g., "The Wall" sorts under "W", not "T".
- [ ] Albums starting with "A " or "An " sort under "A" (not stripped).
- [ ] An album literally titled "The" (no other word) sorts under "T".

## 5. Run the test suites

```pwsh
cd backend
npm test
```

Targeted tests added by this feature:
- `tests/unit/album-groups-service.test.ts` — group selection rules (rating floor, neglect threshold, random uniqueness, empty-group handling)
- `tests/unit/album-sort-the-article.test.ts` — "The"-aware sort comparator against a ≥20-title fixture (SC-007)
- `tests/unit/artist-spotlight-repo.test.ts` — least-recently-shown round-robin (including NULLS FIRST behaviour)
- `tests/integration/library-albums-groups.test.ts` — full endpoint with mocked Plex
- `tests/integration/library-albums-all.test.ts` — full endpoint with mocked Plex

```pwsh
cd frontend
npm test
```

Targeted tests added by this feature:
- `tests/unit/AlbumCard.test.tsx` — hover-vs-details affordance, keyboard tab order, restart-same-album behaviour
- `tests/unit/AlbumGroupRow.test.tsx` — empty group hidden, ≤5 entries enforced
- `tests/unit/album-sort-the-article.test.ts` — frontend parity test using the shared fixture
- `tests/unit/use-play-album.test.tsx` — queue replacement + navigation order

## 6. Performance verification (SC-003 / SC-004)

Use Chrome DevTools Performance tab:

1. **SC-003** — open the albums view with a library of ~1,000 albums. Measure First Meaningful Paint. Target: < 2 s.
2. **SC-004** — open `/albums/all` with a library of ≥10,000 albums. Scroll continuously and measure FPS. Target: sustained 60 fps.

If the 10,000-album scenario fails 60 fps, investigate:
- Verify `content-visibility: auto` is applied to off-screen rows (DevTools → Rendering → "Show layout shift regions" / Elements → Computed styles).
- Verify cover images have `loading="lazy"`.
- Check the Network panel: the `/library/albums/all` payload should be gzip-encoded.

## 7. Accessibility verification (SC-006)

Run the existing axe-core / jest-axe pass:

```pwsh
cd frontend
npm test -- --run AlbumCard
```

Manual keyboard sweep:
- Tab through an entire group row: each card produces exactly 2 focusable stops (play button + details link), each with a clear focus indicator and a descriptive accessible name (e.g., "Play Abbey Road", "Open details for Abbey Road").
- Tab to the "Browse All Albums" tile inside Random Picks: focus indicator visible, Enter activates.

## 8. Rollback procedure

If the feature must be rolled back:

```pwsh
# Roll back the migration
cd backend
psql $DATABASE_URL -f drizzle/0009_rollback_artist_spotlight_state.sql
# (or)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS artist_spotlight_state CASCADE;"
```

Restore `frontend/src/pages/AlbumGridPage.tsx` from git history, revert the route change in `frontend/src/App.tsx`, and remove the new routes/components. The legacy `/api/v1/library/albums` endpoint is unchanged and continues to function for the restored flat grid.

## 9. Known gotchas

- **Plex `userRating`** is on a 0–10 scale, NOT 0–5. The spec's "3+ stars" threshold maps to `userRating >= 6`. The Plex UI displays half-stars; we always read the underlying integer.
- **Plex `lastViewedAt`** is unix *seconds* (not milliseconds). The parser multiplies by 1000 before constructing a `Date`.
- **First-time visit on an empty `artist_spotlight_state`**: all eligible artists have `last_spotlighted_at = null`, so the SQL join uses NULLS FIRST. The first request's results are deterministic by `artist_id` ASC as a tie-breaker, then subsequent visits rotate normally.
- **Re-auth / server switch**: the existing data-wipe service from `002-plex-auth-workflow` should also `TRUNCATE artist_spotlight_state` when the server/account changes (Plex `ratingKey`s are per-server and not portable). Verify this is wired up; if missing, file a follow-up issue.
