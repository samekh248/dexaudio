# Research: Album Cover Load Animation

**Date**: 2026-05-29  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## 1. Image load completion detection

**Decision**: Use native `<img>` lifecycle — `onLoad` / `onError` — plus a mount-time check of `img.complete && img.naturalWidth > 0` for browser-cache hits.

**Rationale**: No new dependencies; `onLoad` fires only after the image is decoded and paint-ready, satisfying FR-001. Cached images often report `complete` before React attaches handlers; the mount check avoids skipping the reveal path while still starting from hidden (FR-011 edge case for instant cache).

**Alternatives considered**:
- `Image()` preloader in JS — duplicates DOM decode path; rejected.
- Intersection Observer only — does not guarantee decode complete; rejected.

## 2. Animation mechanism

**Decision**: CSS `@keyframes` in `frontend/src/styles/themes.css` with a single utility class (e.g. `.album-cover-reveal`) toggled when phase transitions to `revealing`. Cover uses combined opacity + `translateY` (start +6px → 0 with slight overshoot). Reduced motion: `@media (prefers-reduced-motion: reduce)` disables transform, keeps opacity transition only.

**Rationale**: Constitution V forbids new animation libraries. Project already uses CSS keyframes in `themes.css` with reduced-motion overrides (eq visualizer). Total duration ~350ms fits SC-002 (&lt;600ms).

**Alternatives considered**:
- Framer Motion — new dependency; rejected.
- Tailwind-only `animate-in` — no built-in bounce-up; custom keyframes still required.

**Timing defaults** (planning baseline):
| Property | Value |
|----------|-------|
| Fade duration | 300ms |
| Peak upward offset | 6px |
| Easing | ease-out with slight overshoot on Y |
| Fail timeout | 10s (FR-008) |

## 3. Shared abstraction

**Decision**: Extract `useAlbumCoverLoad(artUrl: string | undefined)` hook + `AlbumCoverImage` presentational component. Refactor `AlbumCard`, `AlbumGrid`, and `ArtistSpotlightTile` stack layers to use them.

**Rationale**: Three call sites share identical state machine (FR-006). Hook exposes `phase` so parents can gate text visibility (FR-012) and play overlay (FR-009). Component owns empty slot, hidden `<img>`, fallback, and reveal class.

**Alternatives considered**:
- Duplicate logic in each component — violates DRY; rejected.
- Context provider — overkill for per-card state; rejected.

## 4. Re-render / replay prevention (FR-011)

**Decision**: Module-scoped `Set<string>` of URLs that have completed reveal in the session. On mount, if URL is in set, initialize phase as `revealed` (no animation class).

**Rationale**: Survives list re-renders and React Query refetches without replaying entrance. Cleared naturally on full page reload (acceptable). Source change (different URL) is a new key → animates again.

**Alternatives considered**:
- `sessionStorage` persistence — unnecessary; spec only forbids replay on re-render.
- `useRef` per component instance — lost on unmount/remount in virtualized lists; Set is more stable.

## 5. Play overlay gating (FR-009)

**Decision**: Add optional `revealComplete?: boolean` (default `true` for backward compat) to `PlayAlbumOverlay`. When `false`, apply `pointer-events-none opacity-0` regardless of group hover.

**Rationale**: Minimal change to existing overlay; parent passes `phase === 'revealed'`.

## 6. Artist spotlight text behavior

**Decision**: Stack layer images use `AlbumCoverImage` independently; spotlight tile artist name / album count in `CardContent` remain visible immediately (not gated by stack load state).

**Rationale**: FR-012 targets album title/artist on album cards. Spotlight metadata describes the artist, not a single loading cover. Clarifications scoped stack layers only.

## 7. Testing strategy

**Decision**: Vitest + React Testing Library — unit tests for `useAlbumCoverLoad` state transitions (mock img events, absent URL, error, timeout) and `AlbumCoverImage` render phases. Extend existing `AlbumCard.test.tsx` for overlay gating.

**Rationale**: Matches project test stack; no E2E required for plan phase.
