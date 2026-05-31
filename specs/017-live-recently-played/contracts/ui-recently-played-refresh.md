# UI Contract: Recently Played Live Refresh

**Feature**: 017-live-recently-played  
**Date**: 2026-05-30

## Scope

Client-side behavior binding playback lifecycle to the **Recently Played** library group UI (home row + View all). No new REST endpoints.

---

## Coordinator API (module: `recently-played-refresh-coordinator.ts`)

### `bindRecentlyPlayedRefresh(deps: { queryClient: QueryClient; getLibraryId: () => string; getReportingEnabled: () => Promise<boolean> }): void`

Called once at app init (e.g. `useRecentlyPlayedRefresh` hook in `App.tsx`).

### `notifyAudibleAlbumChange(event: { albumId: string; trackId: string }): void`

Called from `use-player` when:

- Audio is audibly playing (post-load, not buffering-only).
- `event.albumId` is defined and differs from the album currently driving an active dwell/fetch cycle.
- Event is **not** a resume of the same track on the same album.

Must **not** be called on pause/resume-only or same-album track skip.

### `resetRecentlyPlayedRefresh(): void`

Clear timers and in-flight work when library changes or user logs out.

---

## Timing contract

| Step | Duration | Action |
|------|----------|--------|
| Dwell | 5 s continuous audible playback on new album | Wait; cancel if album changes |
| Fetch | ≤ 15 s after dwell ends | `refetchQueries` for `recently-played` keys |
| Retry | Optional at +3 s, +8 s after first fetch | Only if FR-008 lag detected |
| Cancel | Immediate on album change | Abort ignore stale fetch; restart dwell |

---

## TanStack Query contract

**Keys refetched** (both must update):

```typescript
["album-group", "recently-played", libraryId, 10]  // AlbumsHomePage
["album-group", "recently-played", libraryId, 20]  // CategoryAlbumsPage
```

**Keys that MUST NOT refetch** on playback events:

```typescript
["album-group", "recently-added", ...]
["album-group", "hidden-gems", ...]
["album-group", "random-picks", ...]
["album-group", "artist-spotlights", ...]
```

---

## `LibraryGroupSection` contract (Recently Played only)

When `groupKey === "recently-played"`:

| Condition | Render |
|-----------|--------|
| `isPending` | Existing skeleton (unchanged) |
| `isError` | Existing error UI (unchanged) |
| `data && items.length > 0 && isFetching` | **Previous** `items` + heading row with `aria-busy="true"` and visually subtle loading affordance |
| `data && items.length > 0 && !isFetching` | Normal row |

Must **not** return `null`, skeleton, or empty row during background refetch.

---

## `CategoryAlbumsPage` contract (`/library/recently-played`)

Same background-refetch rules as home row:

- Keep `AlbumGrid` populated with previous `data.items` while `isFetching`.
- Show page-level subtle loading indicator (e.g. near title) when `isFetching && data`.

---

## Accessibility

- Loading state exposed via `aria-busy="true"` on the section (or page header) during background fetch.
- Spinner/decoration must have `aria-hidden="true"` if decorative; section `aria-busy` carries status.

---

## Preconditions

- Feature **015** timeline reporting enabled and Plex connected for refresh to produce updated rankings.
- `Track.albumId` present on playing tracks from Plex library.

---

## Test hooks

Export `_resetCoordinatorState()` for unit tests (mirrors `plex-playback-reporter` pattern).
