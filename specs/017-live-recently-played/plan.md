# Implementation Plan: Live Recently Played Updates

**Branch**: `017-live-recently-played` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-live-recently-played/spec.md`

## Summary

The library home **Recently Played** row is cached for 60 seconds and only loads on mount, so it stays stale while the user listens. This feature adds a **frontend refresh coordinator** that, after a **different album** has played audibly for **5 seconds**, **background-refetches** only the `recently-played` TanStack Query keys (home preview limit 10 and View all limit 20), app-wide, with **in-flight cancellation** on album change and a **subtle row-level loading indicator** during fetch. Ranking remains **Plex-sourced** via the existing `/api/v1/library/albums/groups/recently-played` endpoint; accurate data depends on **015 Plex playback reporting** already sending timeline events on each track start.

**No new backend endpoints or database tables.** Backend group selection rules are unchanged.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict); React 19 frontend; Node.js LTS backend (unchanged).

**Primary Dependencies**: Existing stack — TanStack Query v5, Zustand playback queue, `use-player` lifecycle, `plex-playback-reporter` (015). **No new runtime dependencies.**

**Storage**: N/A for this feature (reads existing Plex-backed group API; no new persistence).

**Testing**: Vitest — unit tests for refresh coordinator state machine (dwell, cancel, retry window); component tests for `LibraryGroupSection` background-refetch indicator; integration-style test that album-change triggers targeted query refetch only.

**Target Platform**: PWA (evergreen browsers).

**Project Type**: Web application (`frontend/` primary; `backend/` read-only consumer of existing routes).

**Performance Goals**: Complete Recently Played update within **15 seconds** after the **5-second album dwell** (FR-001); at most **one in-flight** recently-played fetch per library; cancel stale fetches on album change (FR-001c).

**Constraints**: No optimistic local ranking (FR-010); no refetch of other library groups (FR-006); resume and same-album track changes do not refresh (FR-001a); reporting disabled → coordinator still runs but Plex data may not include new plays (FR-005, SC-005); `Track.albumId` required for album-change detection — fall back to no refresh if missing.

**Scale/Scope**: ~1 new frontend module (~150 LOC), hook wiring in `use-player`, UI tweak in `LibraryGroupSection` + `CategoryAlbumsPage`, query-key helper; touches 0 backend files unless albumId gaps found in stream paths.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass (no backend changes) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — N/A |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — reuse existing `Button`; optional `Loader2` icon from lucide via shadcn patterns |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass (N/A) |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — existing `GET /library/albums/groups/recently-played` |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — existing `AlbumGroupResponse` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — `aria-busy` on row during background fetch |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — failed refetch keeps stale cards; no playback impact |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — indicator inline in row header |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass (N/A) |

**Post–Phase 1 re-check**: PASS — frontend-only coordinator; reuses TanStack Query invalidation/refetch patterns already used in `use-library-refresh.ts`.

## Project Structure

### Documentation (this feature)

```text
specs/017-live-recently-played/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-recently-played-refresh.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── lib/
│   │   └── recently-played-refresh-coordinator.ts   # NEW: dwell + cancel + refetch
│   ├── hooks/
│   │   ├── use-player.ts                            # MODIFY: notify coordinator on audible album change
│   │   ├── use-library-home-groups.ts               # MODIFY: export query key helper / lower staleTime optional
│   │   └── use-recently-played-refresh.ts           # NEW: bind queryClient + libraryId at app root
│   ├── components/albums/
│   │   └── LibraryGroupSection.tsx                  # MODIFY: background-refetch loading indicator
│   ├── pages/
│   │   └── CategoryAlbumsPage.tsx                   # MODIFY: same indicator for View all
│   └── App.tsx                                      # MODIFY: mount refresh hook provider
└── tests/
    └── unit/
        ├── recently-played-refresh-coordinator.test.ts  # NEW
        └── LibraryGroupSection.test.tsx                 # MODIFY: refetch indicator cases

backend/                                               # No changes expected
```

**Structure Decision**: Frontend-only orchestration layer. Plex reporting (015) and library group API (008/003) remain the data pipeline; this feature connects playback lifecycle → targeted TanStack Query refetch.

## Complexity Tracking

> No constitutional violations. No new dependencies.

## Phase 0 & Phase 1 Artifacts

| Artifact | Status |
|----------|--------|
| [research.md](./research.md) | ✅ Complete |
| [data-model.md](./data-model.md) | ✅ Complete |
| [contracts/ui-recently-played-refresh.md](./contracts/ui-recently-played-refresh.md) | ✅ Complete |
| [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Notes (for `/speckit-tasks`)

1. **P1 — Coordinator module**: State machine `idle → dwelling(5s) → fetching → idle`; cancel dwell/fetch on album change; expose `notifyAudibleAlbum(albumId)` and `bindQueryClient(client, libraryId)`.
2. **P1 — Player wiring**: Call coordinator when audible playback begins on a **new album** (compare `track.albumId`); skip resume (same track) and same-album track changes; call from same hooks as `onPlaybackPlay` after engine reports playing.
3. **P1 — Targeted refetch**: `queryClient.refetchQueries({ queryKey: ["album-group", "recently-played", libraryId] })` — matches both limit 10 and 20 keys; do **not** invalidate `["album-group"]` broadly.
4. **P1 — Retry window**: After dwell, if refetch completes but expected album absent (optional guard), retry refetch at ~3 s and ~8 s within 15 s total (FR-008).
5. **P2 — UI indicator**: `LibraryGroupSection` + `CategoryAlbumsPage`: when `isFetching && data`, show subtle spinner/`aria-busy` on heading row; keep rendering existing cards (FR-006a).
6. **P2 — Reporting gate**: Skip coordinator refetch when `plexPlaybackReporting.enabled === false` OR no Plex connection (FR-010) — still allow manual page load.
7. **P3 — Tests**: Coordinator unit tests for dwell/cancel/resume/skip-before-5s; assert other group query keys untouched.

**Dependency**: Feature **015-plex-playback-report** MUST be merged/deployed; otherwise Recently Played refetches will return stale Plex play counts.

**Out of scope**: Hidden Gems refresh; optimistic UI ranking; backend cache busting; multi-tab deduplication.
