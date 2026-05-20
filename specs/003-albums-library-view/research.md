# Research: Albums Library View (003-albums-library-view)

**Date**: 2026-05-19
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All items resolved; no `NEEDS CLARIFICATION` remains in the spec or plan. The five clarifications captured during `/speckit-clarify` (rating floor, same-album play, artist rotation, route replacement, neglect threshold) are reflected in the decisions below.

---

## 1. Sourcing per-album metadata from Plex (addedAt, userRating, lastViewedAt)

**Decision**: Extend `plex-client.ts::parseAlbumFromMetadata` to capture three additional Plex `Directory` (album) attributes:

- `addedAt` (unix seconds, Plex always emits) → `addedAt: Date`
- `userRating` (0–10 scale, optional) → `userRating: number | undefined` (a value `r` corresponds to `r/2` stars on the 5-star scale; the spec floor of "3+ stars" maps to `userRating >= 6`)
- `lastViewedAt` (unix seconds, optional) → `lastPlayedAt: Date | undefined`

All three are returned as part of an enriched internal `AlbumWithStats` shape used by the backend services. The public `Album` schema gains `addedAt` and `userRating`; `lastPlayedAt` is consumed only server-side for sorting and is not returned to the client.

**Rationale**:
- Plex already exposes all three on the album `Directory` element in `/library/sections/{id}/all?type=9`. No extra round-trip needed.
- Returning `lastPlayedAt` to the client is unnecessary and leaks data the UI doesn't render.
- Keeping the public `Album` schema additive (no removals) preserves backward compatibility for the album detail page.

**Alternatives considered**:
- Use Plex `/library/sections/{id}/all?type=9&sort=lastViewedAt:desc` to ask Plex for "neglect" ordering. **Rejected**: Plex's sort direction is per-attribute and combining "neglected AND ≥3★" requires multiple filters that Plex doesn't compose well in one query; aggregating client-side (server-side from the browser's POV) over a full album list is simpler and exact.
- Compute play counts from the local `scrobble_outbox` table instead of Plex `viewCount`. **Rejected**: That table tracks pending last.fm scrobbles, not historical totals. Plex's `viewCount`/`lastViewedAt` is the canonical source already used by `top-stats-service.ts`.

---

## 2. Aggregating the five curated groups in a single request

**Decision**: Add `GET /api/v1/library/albums/groups` that returns all five groups in one response:

```jsonc
{
  "recentlyPlayed": [...up to 5 albums...],
  "recentlyAdded":  [...up to 5 albums...],
  "hiddenGems":     [...up to 5 albums...],
  "randomPicks":    [...up to 5 albums...],
  "artistSpotlights": [
    { "artistId", "artistName", "albumCount", "albumArtUrls": [up to 3] },
    ...
  ]
}
```

The backend fetches the full album list for the active library (paginated under the hood at Plex's 1,000-item container limit), applies the five selection rules in-process, and returns the assembled response. Empty groups are emitted as empty arrays; the frontend hides any group with `length === 0` (FR-003).

**Rationale**:
- A single round-trip matches the user-perceived "albums view" load and lets the SW cache one stable key for the whole landing page.
- Each rule is cheap once the album list is in memory (≤50 k items in worst case). Reusing the existing 60 s in-memory `albumCache` keeps subsequent loads sub-100 ms.
- Atomicity: the "Random Picks" set is selected at request time, satisfying FR-028 (stable within a view session, refreshed on re-entry).

**Alternatives considered**:
- Five separate endpoints (`/recent-played`, `/recent-added`, etc.) — **Rejected**: 5× HTTP overhead, no atomic snapshot, harder to SW-cache the home view.
- Server-Sent Events / streaming — **Rejected**: Overkill for a payload of ≤25 albums + ≤5 artist tiles.

---

## 3. "The"-aware sort comparator

**Decision**: Implement a small `sortKeyForTitle(title: string): string` helper in both backend (`album-list-service.ts`) and frontend (`lib/album-sort.ts`) that returns the sort key per FR-024/025:

```ts
export function sortKeyForTitle(title: string): string {
  const trimmed = title.trimStart();
  if (/^the\s+\S/i.test(trimmed)) {
    return trimmed.replace(/^the\s+/i, "").toLocaleLowerCase();
  }
  return trimmed.toLocaleLowerCase();
}
```

The full alphabetical list is sorted server-side using `sortKeyForTitle` so the browser receives albums in display order; the frontend uses the same helper only in unit tests to assert parity and in any client-side filter UIs.

**Rules captured**:
- Only the literal English article `"The "` (case-insensitive) is stripped. `"A "`/`"An "` are NOT stripped (FR-025).
- An album literally titled `"The"` (no following whitespace) sorts under `"T"` (spec edge case).
- `toLocaleLowerCase()` ensures predictable diacritic handling and matches `Intl.Collator` behaviour used for comparison.

**Comparator**: `Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare(sortKeyForTitle(a.title), sortKeyForTitle(b.title))` — `numeric: true` gives the "9 Crimes" before "10 Crimes" behaviour mentioned in edge cases (FR-026).

**Rationale**: Pure-string transformation is trivial to test against a fixture set (SC-007 requires ≥20 such titles).

**Alternatives considered**:
- Strip all articles (`A`, `An`, `The`, plus non-English equivalents) — **Rejected**: contradicts FR-025; the spec explicitly limits the rule to `"The"`.
- Use Plex's `titleSort` attribute when present — **Rejected**: Plex strips multiple articles and is locale-dependent; we need deterministic behaviour matching the project requirement.

---

## 4. Hidden Gems selection algorithm

**Decision**: Server-side, after loading all albums and their `userRating` / `lastPlayedAt`:

1. Filter to albums where `userRating !== undefined && userRating >= 6` (≥3 stars on the 0–10 Plex scale, per Clarification 2026-05-19).
2. Filter to albums where `lastPlayedAt === undefined || lastPlayedAt < now - 90 days` (3-month neglect threshold, per Clarification 2026-05-19).
3. Sort by `(userRating desc, lastPlayedAt asc with null treated as -Infinity, albumId asc as tie-breaker)`.
4. Take the first 5; emit `[]` if none qualify.

**Rationale**: Two filters are simple, fully deterministic, and easy to test. Treating `null lastPlayedAt` as "most neglected" naturally prioritises albums the user has never played but has rated highly (a strong "hidden gem" signal).

**Alternatives considered**:
- Score-based ranking (e.g., `rating * sqrt(days_since_played)`) — **Rejected**: Adds complexity with no clear product win; the simple two-key sort is intuitive and easy to explain.
- Per-track ratings averaged into album rating — **Deferred**: Currently Plex album `userRating` is sufficient; if a future feature surfaces per-track ratings without album-level ratings, this can be revisited.

---

## 5. Artist Spotlight selection (least-recently-shown round-robin)

**Decision**: Add a new table `artist_spotlight_state(artist_id text PRIMARY KEY, last_spotlighted_at timestamptz NOT NULL)`. On each request to `/library/albums/groups`:

1. Fetch all artists in the active library with `albumCount > 2` (eligible set; computed by grouping albums by `parentRatingKey`/artistId server-side, ignoring the spec's "2-or-fewer" cases per FR-011 and the "exactly 2" edge case).
2. Left-join eligible artists with `artist_spotlight_state` to read each artist's `last_spotlighted_at` (null for never-shown).
3. Order by `(last_spotlighted_at ASC NULLS FIRST, artist_id ASC)` and take the first 5.
4. For each chosen artist, upsert `artist_spotlight_state` with `last_spotlighted_at = now()`.
5. For each chosen artist, fetch up to 3 album cover URLs (for the stacked-album visual).

**Rationale**:
- `NULLS FIRST` makes never-shown artists naturally rise to the top — they are surfaced first.
- The upsert step is what makes the rotation actually rotate; without it the same five artists would repeat forever.
- Tie-breaking by `artist_id` keeps results deterministic when many artists share `null` or the same timestamp (e.g., on a fresh database).

**Concurrency**: The single-user assumption (also documented in `002-plex-auth-workflow`) means concurrent requests are vanishingly rare. The upsert uses `INSERT … ON CONFLICT (artist_id) DO UPDATE SET last_spotlighted_at = EXCLUDED.last_spotlighted_at`. If a race ever occurs the worst case is two parallel loads showing the same artist set — acceptable.

**Cleanup of stale entries**: If an artist disappears from the library (e.g., user switched Plex servers), their row in `artist_spotlight_state` becomes dead weight but is harmless (the join filters them out). A periodic prune is **deferred**; the row count is bounded by historical artist count and unlikely to grow beyond a few thousand even in pathological cases.

**Alternatives considered**:
- In-memory rotation state (lost on backend restart) — **Rejected**: Spec requires persistence so the rotation works correctly across sessions; in-memory would re-show the same five on every restart.
- Random selection from eligible set — **Rejected at clarification step** (Q3 answer A).
- Storing state as JSONB in `app_settings` — **Rejected**: A typed table is easier to query, index, and reason about; adds <30 lines to the schema.

---

## 6. Browse All Albums — virtualization at 10 k+ scale

**Decision**: Implement Browse All as a single-page list using a lightweight manual chunking approach:

1. Backend `GET /api/v1/library/albums/all?libraryId=…` returns the full list of `AlbumListItem`s (id, title, artist, artUrl, sortKey) sorted by `sortKey` — typically 1–50 k items, each ~200 bytes → 200 KB–10 MB payload uncompressed, much smaller gzipped.
2. Frontend renders a single CSS-grid container and uses `IntersectionObserver` + `content-visibility: auto` on each row to defer paint/layout of off-screen rows.
3. Album cover images use the existing browser-native `loading="lazy"` attribute (already idiomatic in `AlbumGridPage.tsx`).

This satisfies SC-004 (sustained 60 fps scroll on ≥10 k albums) **without** introducing a virtualization library like `react-window` or `react-virtuoso` — preserving Principle V.

**Rationale**:
- `content-visibility: auto` is supported in all evergreen browsers as of 2024 and skips both layout and paint for off-screen subtrees, giving us "virtualization for free".
- The full payload is acceptable for music libraries (even 50 k albums × 200 bytes = 10 MB raw, ~1–2 MB gzipped) — comparable to a single high-res image.
- No new dependency.

**Alternatives considered**:
- `react-window` / `react-virtuoso` — **Rejected**: Constitution V (no new libraries without explicit user request).
- Server-side pagination with infinite scroll — **Rejected for the canonical "Browse All" view**: alphabetic jump-to-letter is a common follow-up that paginated lists handle poorly. We keep the existing paginated `/library/albums` endpoint for any future use cases but the Browse All page uses the full-list endpoint.

**Cache strategy**: `Cache-Control: private, max-age=60, stale-while-revalidate=600` on the response; TanStack Query treats it as fresh for 30 s (existing default).

---

## 7. Switching to Now Playing after starting an album

**Decision**: Encapsulate the "play album" interaction in a new hook `use-play-album.ts`:

```ts
export function usePlayAlbum() {
  const navigate = useNavigate();
  const playNow = usePlaybackQueue((s) => s.playNow);
  return useCallback(async (albumId: string) => {
    const tracks = await api.getAlbumTracks(albumId);
    playNow(tracks);
    navigate("/now-playing");
  }, [navigate, playNow]);
}
```

`AlbumCard` and `ArtistSpotlightTile` invoke this hook on their play affordance. Order matters: the queue is updated **before** navigation, so `NowPlayingPage`'s first render already sees the new `currentIndex: 0` item (FR-016a).

**Restart-same-album behaviour (FR-016c)**: `playNow` already replaces user items and resets `currentIndex` to 0 in the existing `playback-queue-store.ts`. Calling it with the same album's tracks therefore implicitly restarts. No store changes required.

**Back navigation (FR-016b)**: React Router preserves scroll position by default with the existing `<BrowserRouter>`. The Now Playing view continues playback regardless of route changes (the audio element lives in `AudioPlayer` and is mounted by `NowPlayingPage`, but playback state is in `playback-queue-store` + `usePlayer` — `useEffect` on `current?.id` only reloads on track change, so back-navigation doesn't restart playback).

**Rationale**: Keeps the interaction logic in one testable hook. The store, navigation, and Now Playing page remain unchanged.

**Alternatives considered**:
- Add a separate `restartAlbum` action to the store — **Rejected**: `playNow` already does what's needed; an extra action is duplication.
- Use a route-level redirect on `/play/album/:id` — **Rejected**: Adds an unnecessary URL surface for a transient action; the hook approach keeps URLs meaningful.

---

## 8. Stacked-album visual for Artist Spotlight tiles

**Decision**: Compose three `<img>` elements (or placeholders) inside a relative-positioned container with rotation/offset CSS:

```
[ #3 cover, rotated +6°, offset right ]
  [ #2 cover, rotated +2°, offset center ]
    [ #1 cover, rotated -4°, offset left ]
```

Use up to three of the artist's albums' cover URLs (returned by the groups endpoint as `albumArtUrls[]`, max 3). The artist name renders below the stack. The whole tile is wrapped in a focusable container with a play overlay button identical to `AlbumCard` and a separate accessible link to the artist's albums page.

**Rationale**:
- A purely CSS-based stack avoids any new graphics library or canvas work.
- Three covers is enough to convey "multiple albums" at a glance without visual clutter.
- The DOM structure mirrors `AlbumCard` (play button + details link as separate focusable children), so accessibility patterns are reused.

**Alternatives considered**:
- Single composite image generated server-side — **Rejected**: Adds backend image-processing dependency and complicates cache invalidation.
- A grid of N small covers — **Rejected**: Less visually distinct from a "row of albums"; "stacked" is the explicit project requirement.

---

## 9. Offline behaviour (PWA / Principle IV)

**Decision**: Rely on the existing service worker `stale-while-revalidate` strategy already in place for API responses. The groups endpoint returns a small payload that is well-suited to SW caching. Album cover images use the existing image-cache strategy.

**When offline**:
- The grouped landing view renders from the last cached `groups` response (so users see their previously-loaded albums even with no network).
- Hover-to-play attempts will fail at the track-fetch step (`api.getAlbumTracks`) — handled by surfacing a toast/error and leaving the user on the albums view (no half-broken Now Playing).
- Pinned/pre-cached tracks remain fully playable (existing behaviour).

**Rationale**: Reuses existing PWA infrastructure; no new caching code in this feature.

---

## 10. Removal of `AlbumGridPage` and route migration

**Decision**:
- `App.tsx` change: route `index` (`/`) now renders `AlbumsHomePage` instead of `AlbumGridPage`.
- New route: `/albums/all` renders `BrowseAllAlbumsPage`.
- The file `frontend/src/pages/AlbumGridPage.tsx` is **deleted** (FR-001a).
- React Router `Routes` does not have a "legacy redirect" entry because the old albums page was already mounted at `/` (the same URL). For any external bookmarks that might have targeted `/albums` (none exist today but future-proofing per FR-001b), add a `<Route path="albums" element={<Navigate to="/" replace />} />`.

**Rationale**: Minimal route churn; the canonical URL (`/`) is unchanged, satisfying the "no broken links" requirement.
