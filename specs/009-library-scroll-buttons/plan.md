# Implementation Plan: Library Scroll Buttons

**Branch**: `009-library-scroll-buttons` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-library-scroll-buttons/spec.md`

## Summary

Replace the native horizontal scrollbar on library home carousel rows with **always-visible left/right scroll buttons** in **dedicated edge gutters** that do not cover album cards. Each button press scrolls by the count of **fully visible** entries, snapping the new leading entry to the left edge of the scroll viewport. Unavailable controls are **hidden** (not disabled). **Frontend-only** — no backend or API changes; all behavior lives in `AlbumGroupRow` and a supporting scroll hook.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19.2.x; Node.js 22.x LTS (tests only)

**Primary Dependencies**:
- **Frontend**: React, shadcn/ui `Button`, `lucide-react` (`ChevronLeft`, `ChevronRight`), Tailwind CSS
- **Backend**: No changes
- **Shared types**: No changes

**Storage**: N/A (ephemeral scroll position in DOM only)

**Testing**: Vitest + React Testing Library — unit tests for `useHorizontalCarousel` scroll math and `AlbumGroupRow` button visibility; update existing `AlbumGroupRow.test.tsx`

**Target Platform**: PWA frontend; viewports 320 px–desktop

**Performance Goals**: Scroll step calculation &lt; 16 ms on rows with ≤11 entries; no layout thrash on resize (debounced via `ResizeObserver`)

**Constraints**:
- Constitution II: shadcn/ui `Button` for controls
- Constitution V: no new npm dependencies (use native DOM APIs + existing stack)
- Scope: library home carousel rows only (`AlbumGroupRow` usage on `AlbumsHomePage`)

**Scale/Scope**: One component refactor + one hook + CSS utility; ~5 files touched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ N/A (no BE change) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ N/A |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — `Button` from shadcn/ui |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — hook is logic, not a UI library |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ Pass — no API change |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — `aria-label` on buttons, keyboard operable |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — existing SW unchanged |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — resize recalc required |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ N/A |

**Post-design re-check**: All gates remain ✅.

## Project Structure

### Documentation (this feature)

```text
specs/009-library-scroll-buttons/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-carousel.md   # Component behavior contract
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── hooks/
│   └── use-horizontal-carousel.ts   # NEW — scroll math, visibility state
├── components/albums/
│   └── AlbumGroupRow.tsx            # MODIFY — gutters, buttons, hide scrollbar
└── index.css (or globals)           # MODIFY — scrollbar-hide utility if needed

frontend/tests/unit/
├── use-horizontal-carousel.test.ts  # NEW
└── AlbumGroupRow.test.tsx           # MODIFY
```

**Structure Decision**: Web monorepo; all implementation in `frontend/`. `AlbumGroupRow` is the single integration point used by `AlbumsHomePage` for all five curated groups.

## Complexity Tracking

No constitution violations.

## Phase 0: Research

See [research.md](./research.md). Resolved: gutter layout, DOM-based visible-count algorithm, snap via `scrollIntoView`, scrollbar hiding via CSS, `ResizeObserver` + scroll listeners for button state.

## Phase 1: Design

### Data model

See [data-model.md](./data-model.md) — `CarouselScrollState`, visible-entry algorithm, scroll-step transitions.

### Contracts

See [contracts/ui-carousel.md](./contracts/ui-carousel.md) — `AlbumGroupRow` carousel UX contract (no REST changes).

### Implementation sequence (for `/speckit-tasks`)

1. **`useHorizontalCarousel` hook**: Attach to scroll container ref; expose `{ scrollRef, scrollForward, scrollBackward, canScrollLeft, canScrollRight, needsScrollControls }`; compute fully-visible child count from `getBoundingClientRect`; snap target via `scrollIntoView({ inline: 'start', behavior: 'smooth' })`.
2. **`AlbumGroupRow` layout**: Wrap in `flex` row — left gutter (button) | scroll area | right gutter (button). Hide buttons when `!canScrollLeft` / `!canScrollRight`. Hide both gutters when `!needsScrollControls`.
3. **Scrollbar CSS**: Add `[scrollbar-width:none]` + `::-webkit-scrollbar { display:none }` on scroll container (Tailwind arbitrary or small utility class).
4. **Accessibility**: `aria-label="Scroll left"` / `"Scroll right"` on icon buttons; preserve focusable carousel `role="region"`.
5. **Tests**: Unit-test visible-count and step index math with mocked DOM rects; component tests for button presence/absence at start/end and no scrollbar class.
6. **Manual QA**: All five home rows at narrow/typical/wide widths per [quickstart.md](./quickstart.md).

### Agent context

`.cursor/rules/specify-rules.mdc` updated to reference this plan.
