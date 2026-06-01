# Implementation Plan: Album Group Slide-In Animation

**Branch**: `022-album-group-slide-in` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-album-group-slide-in/spec.md`

## Summary

Albums library home curated groups (Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights) MUST keep each row in its loading state until **every** carousel entry is content-ready (covers/fallbacks per 011), then reveal entries with a **left-to-right staggered slide-in** clipped by the group carousel. Covers finish load/reveal while the row is invisible; slide-in is the only visible entrance. Reduced motion: shared fade, no slide/stagger. Session `Set` skips re-animation on in-app return; full reload or library change may animate again. **Frontend-only** — CSS keyframes in `themes.css`, new `LibraryGroupReveal` / `GroupRevealEntry` components, extend `LibraryGroupSection` and home page wiring.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19.x; Node.js 22.x LTS (tests only)

**Primary Dependencies**:
- **Frontend**: `LibraryGroupSection`, `AlbumGroupRow`, `AlbumCard`, `ArtistSpotlightTile`, `BrowseAllTile`, `AlbumCoverImage` / `useAlbumCoverLoad` (011)
- **Backend**: No changes
- **Shared types**: No changes — uses existing `LibraryGroupKey`, `Album`, `ArtistSpotlight`

**Storage**: Module-scoped `REVEALED_GROUP_KEYS: Set<string>` (`${libraryId}:${groupKey}`); cleared on active library change

**Testing**: Vitest + RTL — `use-library-group-reveal.test.ts`, `LibraryGroupReveal.test.tsx`; extend `LibraryGroupSection` / `AlbumsHomePage` tests as needed

**Target Platform**: PWA frontend; 320 px–desktop

**Performance Goals**: Group reveal starts within 1 s of last entry ready (SC-001); entrance animation total under ~1 s for 10 entries (60 ms stagger × 9 + 400 ms slide); no layout shift when transitioning preparing → animating

**Constraints**:
- Constitution V: CSS keyframes only — no animation libraries
- FR-003: clip via existing `AlbumGroupRow` `overflow-x-auto`
- FR-009: `prefers-reduced-motion` → container fade, no stagger
- FR-008: home groups only
- Coordinate with 011: no cover bounce visible after slide lands

**Scale/Scope**: ~8 new/modified frontend files + CSS + tests; no API routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ N/A (no BE change) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ N/A |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — extends existing album components |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — `LibraryGroupReveal` / `GroupRevealEntry` (no shadcn equivalent) |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ Pass — no API change |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — `aria-busy`, focus gating, reduced motion |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — no new network surface |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — carousel unchanged |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ N/A |

**Post-design re-check**: All gates remain ✅.

## Project Structure

### Documentation (this feature)

```text
specs/022-album-group-slide-in/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-library-group-reveal.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── components/albums/
│   ├── LibraryGroupReveal.tsx       # NEW — phase machine, context, session Set
│   ├── GroupRevealEntry.tsx         # NEW — stagger index, ready registration
│   ├── LibraryGroupSection.tsx      # MODIFY — wrap children in LibraryGroupReveal
│   ├── AlbumCard.tsx                # MODIFY — optional onRevealCompleteChange
│   ├── ArtistSpotlightTile.tsx      # MODIFY — aggregate layer readiness callback
│   └── AlbumGroupRow.tsx            # (unchanged logic; clipping container)
├── hooks/
│   └── use-library-group-reveal.ts  # NEW — phase + entry registry + reduced motion
├── pages/
│   └── AlbumsHomePage.tsx           # MODIFY — GroupRevealEntry per carousel item
└── styles/
    └── themes.css                   # MODIFY — group slide + reduced-motion fade

frontend/tests/unit/
├── use-library-group-reveal.test.ts # NEW
├── LibraryGroupReveal.test.tsx      # NEW
└── LibraryGroupSection.test.tsx     # MODIFY (if exists) or AlbumsHomePage test extend
```

**Structure Decision**: Monorepo web app; all work in `frontend/`. Group orchestration lives beside existing `LibraryGroupSection` / `AlbumGroupRow` home layout.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| `LibraryGroupReveal` + `GroupRevealEntry` | Coordinates multi-entry gate, stagger, session skip, a11y | Inline state in `AlbumsHomePage` × 5 groups duplicates FR-001–FR-012 |
| `onRevealCompleteChange` on cards/tiles | Exposes 011 terminal state to group gate | Polling DOM / timeouts — flaky vs cover phase machine |

No constitution violations.

## Phase 0: Research

See [research.md](./research.md). Resolved: context-based orchestration, opacity-0 preparing mount, CSS stagger via `--group-entry-index`, session `Set` for FR-012, no backend changes.

## Phase 1: Design

### Data model

See [data-model.md](./data-model.md) — `GroupRevealPhase`, entry registry, `REVEALED_GROUP_KEYS`, coupling to `CoverLoadPhase`.

### Contracts

See [contracts/ui-library-group-reveal.md](./contracts/ui-library-group-reveal.md) — component props, animation rules, accessibility, CSS classes.

### Implementation sequence (for `/speckit-tasks`)

1. **`themes.css`**: `@keyframes library-group-entry-slide`, `.library-group-entry-slide`, `.library-group-reveal-fade`, reduced-motion overrides.
2. **`use-library-group-reveal.ts`**: Phase machine, entry registry, `REVEALED_GROUP_KEYS`, reduced-motion listener, library change reset.
3. **`LibraryGroupReveal.tsx` + `GroupRevealEntry.tsx`**: Context provider, preparing invisibility, animating classes.
4. **`LibraryGroupSection.tsx`**: Wrap rendered carousel in `LibraryGroupReveal` with `groupKey`, `libraryId`, `entryCount`.
5. **`AlbumCard.tsx` / `ArtistSpotlightTile.tsx`**: `onRevealCompleteChange` callback when terminal cover state reached.
6. **`AlbumsHomePage.tsx`**: Wrap each carousel entry in `GroupRevealEntry` with index + `ready` state.
7. **Tests**: Hook unit tests, reveal component tests, manual quickstart validation.

### Agent context

`.cursor/rules/specify-rules.mdc` SPECKIT block updated to reference this plan.

## Phase 2

**Not produced by `/speckit-plan`.** Run `/speckit-tasks` to generate `tasks.md` from this plan.
