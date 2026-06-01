# Research: Album Group Slide-In Animation

**Date**: 2026-06-01  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## 1. Orchestration layer

**Decision**: Add `LibraryGroupReveal` wrapper used by `LibraryGroupSection` after group data succeeds. It owns a `GroupRevealPhase` state machine (`preparing` → `animating` → `revealed`) and coordinates entry readiness via React context.

**Rationale**: `LibraryGroupSection` already owns loading/error/data gates; extending it keeps carousel markup in `AlbumGroupRow` while centralizing FR-001/FR-002/FR-005 in one place. Avoids duplicating logic across five home groups on `AlbumsHomePage`.

**Alternatives considered**:
- Per-group logic inside `AlbumsHomePage` — five copies; rejected.
- Global zustand store — unnecessary for ephemeral UI; rejected.

## 2. Entry readiness signals

**Decision**:
- `GroupRevealEntry` wraps each carousel child, registers an index, and reports `ready` upward.
- `AlbumCard`: `ready` when existing `revealComplete` (cover phase terminal).
- `ArtistSpotlightTile`: aggregate up to three `AlbumCoverImage` phases; `ready` when every visible stack layer is terminal (`revealed` | `absent` | `failed`).
- `BrowseAllTile`: `ready` on mount (static content).

**Rationale**: Reuses feature 011 terminal phases without new image logic. Matches clarification: covers finish while row is invisible, then group slide is the only visible motion.

**Alternatives considered**:
- Polling DOM for image completeness — brittle; rejected.
- Delay group until API only — violates FR-001; rejected.

## 3. Hidden preparation vs visible animation

**Decision**: While `preparing`, render the carousel inside a container with `opacity-0` (or `invisible`) and `aria-hidden` on entries, `pointer-events-none`, but keep cards mounted so images load and cover reveal animations can complete off-screen. When all entries report ready, transition to `animating` and remove invisibility before applying slide classes.

**Rationale**: Satisfies “covers complete while row hidden” and FR-005 (no interaction until reveal). `opacity-0` keeps layout stable for carousel measurements.

**Alternatives considered**:
- `display:none` until ready — prevents image load; rejected.
- Defer mounting cards until API returns then wait — correct but still needs invisibility during cover load; opacity approach is simpler.

## 4. Slide + stagger animation

**Decision**: CSS `@keyframes library-group-entry-slide` in `themes.css` — `transform: translateX(-24px)` → `0`, `opacity: 0` → `1`. Per-entry `animation-delay: calc(var(--group-entry-index) * 60ms)` via inline style or class. Carousel `overflow-x-auto` on `AlbumGroupRow` provides clipping (FR-003).

**Rationale**: Constitution V (no new animation libraries). Stagger via `animation-delay` avoids JS timers. 60 ms × 10 entries + 400 ms duration ≈ 940 ms, within SC-001’s 1 s budget after last cover ready.

**Alternatives considered**:
- Framer Motion stagger — new dependency; rejected.
- Tailwind `animate-in slide-in-from-left` — stagger delay less explicit; custom keyframes preferred for reduced-motion swap.

**Timing defaults**:

| Property | Value |
|----------|-------|
| Slide distance | 24px from left |
| Slide duration | 400ms per entry |
| Stagger delay | 60ms × index (carousel order) |
| Reduced-motion fade | 250ms shared on container |

## 5. Reduced motion (FR-009)

**Decision**: Reuse `prefers-reduced-motion` check (same pattern as `use-album-cover-load`). When true, skip per-entry slide keyframes; fade in entire carousel row at once (`library-group-reveal-fade` on container).

**Rationale**: Matches clarification session — no stagger, no horizontal slide.

## 6. Session re-reveal prevention (FR-012)

**Decision**: Module-scoped `Set<string>` keyed `${libraryId}:${groupKey}`. On mount, if key present, skip `animating` and show row immediately at `revealed`. Clear implicitly on full page reload. Reset set when `activeLibraryId` changes (listen in hook or `AlbumsHomePage`).

**Rationale**: Mirrors `REVEALED_URL_CACHE` pattern from 011. In-app navigation back to home reads same session without replay.

**Alternatives considered**:
- `sessionStorage` — spec only requires session scope; in-memory Set sufficient for SPA navigation.

## 7. Retry and library change

**Decision**: Failed group retry replaces query data → new `LibraryGroupReveal` mount with fresh key `${groupKey}-${fetchCount}` or reset phase when `refetch` succeeds. Library switch clears `REVEALED_GROUP_KEYS` for previous library or entire Set on `libraryId` change.

**Rationale**: FR-010/FR-012 edge cases without persisting animation state across libraries.

## 8. Scope boundaries

**Decision**: No backend/API changes. No changes to `CategoryAlbumsPage`, `AlbumGrid`, or browse-all views (FR-008).

**Rationale**: Spec limits behavior to albums library home curated groups.
