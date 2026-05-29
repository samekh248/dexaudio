# Implementation Plan: Album Cover Load Animation

**Branch**: `011-album-cover-load-animation` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-album-cover-load-animation/spec.md`

## Summary

Album library views (`AlbumCard`, `AlbumGrid`, artist spotlight stack layers) MUST hide cover images until fully loaded, then reveal with a synchronized fade-in and short bounce-up. Empty slots while loading; title/artist on album cards fade in with the cover; play overlay stays hover-only after reveal. Shared `useAlbumCoverLoad` hook + `AlbumCoverImage` component; CSS keyframes in `themes.css`; no new npm packages. Frontend-only.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19.x; Node.js 22.x LTS (tests only)

**Primary Dependencies**:
- **Frontend**: Existing `AlbumCard`, `AlbumGrid`, `ArtistSpotlightTile`, `PlayAlbumOverlay`, `AspectRatio` (shadcn), Tailwind CSS
- **Backend**: No changes
- **Shared types**: No changes — uses existing `Album.artUrl`, `ArtistSpotlight.albumArtUrls`

**Storage**: Module-scoped `Set<string>` for session revealed URLs (FR-011); no persistence

**Testing**: Vitest + React Testing Library — `use-album-cover-load.test.ts`, `AlbumCoverImage.test.tsx`; extend `AlbumCard.test.tsx`

**Target Platform**: PWA frontend; 320 px–desktop

**Performance Goals**: Reveal animation completes within 600 ms of load (SC-002); zero CLS on cover slot (SC-003); independent per-image reveal (FR-005)

**Constraints**:
- Constitution V: no new animation libraries — CSS keyframes only
- FR-009: play overlay gated until `revealed`
- FR-010: `prefers-reduced-motion` → fade only
- FR-008: 10 s load timeout → fallback

**Scale/Scope**: ~5 new/modified frontend files + CSS + tests; no API routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ N/A (no BE change) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ N/A |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — extends existing album components |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — `AlbumCoverImage` required (no shadcn equivalent) |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ Pass — no API change |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — reduced motion, no focus on hidden text, gated overlay |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — img load behavior unchanged offline |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — aspect ratio preserved |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ N/A |

**Post-design re-check**: All gates remain ✅.

## Project Structure

### Documentation (this feature)

```text
specs/011-album-cover-load-animation/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-album-cover-reveal.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── components/albums/
│   ├── AlbumCoverImage.tsx          # NEW — slot, img, fallback, reveal class
│   ├── AlbumCard.tsx                # MODIFY — hook + text sync + overlay gate
│   ├── AlbumGrid.tsx                # MODIFY — use AlbumCoverImage + text sync
│   ├── ArtistSpotlightTile.tsx      # MODIFY — AlbumCoverImage per stack layer
│   └── PlayAlbumOverlay.tsx         # MODIFY — revealComplete prop
├── hooks/
│   └── use-album-cover-load.ts      # NEW — phase machine, timeout, URL cache
└── styles/
    └── themes.css                   # MODIFY — @keyframes album-cover-reveal

frontend/tests/unit/
├── use-album-cover-load.test.ts     # NEW
├── AlbumCoverImage.test.tsx         # NEW
└── AlbumCard.test.tsx               # MODIFY — overlay + text gating
```

**Structure Decision**: Monorepo; all implementation in `frontend/`. Shared hook/component eliminates duplication across three consumers.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| Custom `AlbumCoverImage` | shadcn/ui has no lazy-reveal image primitive | Inline duplicate logic in 3 components violates FR-006 consistency |

No constitution violations.

## Phase 0: Research

See [research.md](./research.md). Resolved: native img onLoad + cache check, CSS keyframes in themes.css, shared hook/component, session URL Set for FR-011, spotlight text stays immediate.

## Phase 1: Design

### Data model

See [data-model.md](./data-model.md) — `CoverLoadPhase`, transitions, parent visibility coupling.

### Contracts

See [contracts/ui-album-cover-reveal.md](./contracts/ui-album-cover-reveal.md) — component props, animation rules, accessibility.

### Implementation sequence (for `/speckit-tasks`)

1. **`themes.css`**: Add `@keyframes album-cover-reveal`, fade-only variant, reduced-motion override, sync text class.
2. **`use-album-cover-load.ts`**: Phase machine, 10s timeout, revealed URL Set, reduced-motion detection.
3. **`AlbumCoverImage.tsx`**: Empty slot, hidden img, fallback, animation class application.
4. **`PlayAlbumOverlay.tsx`**: `revealComplete` prop gating hover visibility.
5. **`AlbumCard.tsx`**: Integrate hook; sync `CardContent` opacity; pass `revealComplete`.
6. **`AlbumGrid.tsx`**: Same integration as AlbumCard (or extract shared `AlbumGridCell` if duplication is heavy).
7. **`ArtistSpotlightTile.tsx`**: Replace stack `<img>` with `AlbumCoverImage`; keep artist metadata immediate.
8. **Tests**: Hook unit tests, component tests, AlbumCard integration tests.
9. **Manual**: Run [quickstart.md](./quickstart.md) checklist with throttled network + reduced motion.

## Phase 2

Task breakdown deferred to `/speckit-tasks`.
