# Research: Live Recently Played Updates

**Date**: 2026-05-30  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All technical unknowns resolved; no `NEEDS CLARIFICATION` remains.

---

## 1. Trigger mechanism (album change + 5 s dwell)

**Decision**: New module `recently-played-refresh-coordinator.ts` maintains `lastAudibleAlbumId`, starts a **5 s timer** when `track.albumId` changes and playback is audible, then calls TanStack Query **`refetchQueries`** for keys prefixed `["album-group", "recently-played", libraryId]`.

**Rationale**: Clarifications require app-wide background refresh, album-change-only, 5 s debounce, cancel in-flight on change. A dedicated coordinator keeps `use-player` thin and is unit-testable without React.

**Alternatives considered**:

- **Broad `invalidateQueries(["album-group"])`** — rejected; violates FR-006 (refreshes all groups).
- **Polling every N seconds** — rejected; unrelated to playback events and wastes Plex API calls.
- **Optimistic reorder in Zustand** — rejected; FR-010 forbids local-only ranking.

---

## 2. TanStack Query refetch vs invalidate

**Decision**: Use **`refetchQueries`** (not full-tree invalidate) with partial key:

```typescript
queryClient.refetchQueries({
  queryKey: ["album-group", "recently-played", libraryId],
});
```

This matches both home (`limit: 10`) and View all (`limit: 20`) query keys and runs **even without active observers** (background refresh per clarification A).

**Rationale**: `use-library-home-groups.ts` sets `staleTime: 60_000` and `refetchOnWindowFocus: false`; passive invalidation would not refetch until remount. Explicit refetch satisfies FR-001 and FR-007.

**Alternatives considered**:

- **Set `staleTime: 0` globally for recently-played** — rejected; still needs playback-driven refetch, not mount-only.
- **React Query `queryClient.setQueryData` patch** — rejected; violates Plex-as-source-of-truth.

---

## 3. Resume and same-album detection

**Decision**: Coordinator receives notifications only when **`track.albumId` differs** from the last album for which a dwell was started or completed. Resume (`onPlaybackPlay` same track) and same-album skip do **not** call the coordinator.

**Rationale**: Clarification D — refresh only on different album. `use-player` already distinguishes track changes via load lifecycle; album id from `Track.albumId` (`parentRatingKey` from Plex parser).

**Edge case**: Missing `albumId` → log once, skip refresh (no safe album key).

---

## 4. In-flight fetch cancellation

**Decision**: Coordinator tracks `dwellTimerId`, `fetchAbortController` (or generation counter). On album change: `clearTimeout(dwell)`, `abort()` active fetch if using `AbortSignal` in `api-client`, increment `generation` so late responses are ignored, clear UI loading flag.

**Rationale**: Clarification A on Q5. TanStack Query refetch supports `signal` via `queryFn` meta or custom wrapper; simpler approach: **generation token** — ignore refetch result if `generation !== current`.

**Alternatives considered**:

- **Let stale fetch complete** — rejected by spec FR-001c.
- **Queue sequential fetches** — rejected; user chose cancel + restart.

---

## 5. Plex reporting sequencing

**Decision**: Do **not** add a new reporting path. Timeline **`playing`** is sent at track start by `plex-playback-reporter` (015). The **5 s dwell** gives Plex time to persist play activity before querying Recently Played. Optional **retry refetches** at 3 s and 8 s after first fetch within the 15 s completion window (FR-008).

**Rationale**: FR-004 requires reporting before refresh; track-start report + 5 s dwell satisfies ordering without blocking playback. Separate dwell for UI vs report aligns with spec Assumptions.

**Alternatives considered**:

- **Await timeline POST before refetch** — rejected; adds latency and couples modules; dwell is sufficient.
- **Backend push/WebSocket** — rejected; constitution REST-only, out of scope.

---

## 6. Background-refetch loading UX

**Decision**: Use TanStack Query flags: **`isFetching && data`** → show subtle loading indicator on Recently Played section heading (`aria-busy="true"`, small spinner). **`isPending`** (no data yet) keeps existing skeleton — unchanged for first load.

**Rationale**: Clarification B — cards stay visible during fetch; indicator only after threshold when fetch runs.

**Alternatives considered**:

- **Skeleton on every refetch** — rejected (FR-006a).
- **No indicator** — rejected; users need feedback during 15 s window.

---

## 7. Reporting disabled / offline

**Decision**: Coordinator checks `plexPlaybackReporting.enabled` and Plex connection (reuse `refreshPlexReportingGate()` from reporter or settings API) before scheduling dwell/refetch. When disabled, **no-op** — row shows last Plex snapshot (FR-010, SC-005).

**Rationale**: Avoid useless Plex group API calls when reports are not sent.

---

## 8. Dependency on 015

**Decision**: Treat **015-plex-playback-report** as hard prerequisite. Implementation tasks should verify timeline reporting in quickstart before validating Recently Played live updates.

**Rationale**: Recently Played ranking reads Plex 30-day play counts; without timeline reports, refetch returns unchanged data.
