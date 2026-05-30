# Implementation Plan: Volume Icon with Vertical Slider

**Branch**: `016-volume-icon-slider` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-volume-icon-slider/spec.md`

## Summary

Replace the always-visible horizontal volume slider on the **Now Playing** page with a **sound icon** that opens a **vertical volume popover**. Add the same control inside the **header playback panel** (next to previous / play-pause / next) when that panel is open; closing the panel closes an open volume popover. Volume remains **app-wide**, driven by existing `usePlayer().volume` / `setVolume` and `localStorage` persistence—**frontend-only**, no API or schema changes.

Technical approach: new shared **`VolumeControl`** component (Radix Popover + vertical shadcn `Slider` + Lucide `Volume2`/`VolumeX`), wire into **`AudioPlayer`** and **`NowPlayingControlPanel`**, pass volume props from **`NowPlayingNav`** and **`NowPlayingPage`**.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict); React 19 frontend.

**Primary Dependencies**: Existing only — `@radix-ui/react-popover`, `@radix-ui/react-slider` (via shadcn `Slider`), `lucide-react`, Tailwind. **No new npm packages.**

**Storage**: Browser `localStorage` via existing `StorageKeys.volume` (unchanged).

**Testing**: Vitest + React Testing Library — unit tests for `VolumeControl` and updated `NowPlayingControlPanel` tests.

**Target Platform**: PWA (evergreen browsers); 320px–desktop.

**Project Type**: Web application (`frontend/` only for implementation).

**Performance Goals**: Volume changes apply on slider drag with no perceptible lag (existing `setVolume` path); popover open/close without layout shift (SC-005).

**Constraints**: WCAG 2.1 AA on trigger and slider; header volume only when panel open; muted icon only at `volume === 0`; no backend work.

**Scale/Scope**: ~1 new component, 3 modified components, 1 modified layout nav, 2 test files; zero DB/API.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | N/A — no backend changes |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | N/A |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — shadcn `Slider`, `Button`; Radix Popover matches existing `AccountWidget` pattern until `popover` CLI added |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — `VolumeControl` composes primitives (see Complexity Tracking) |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | N/A — no API |
| Shared TypeScript types defined for all API contracts | III. API Contract | N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — aria-labels, keyboard popover/slider |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — volume is local-only |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — popover portaled; touch targets on thumb |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass (N/A) |

**Post–Phase 1 re-check**: PASS — design reuses player volume pipeline and Radix Popover already in the tree.

## Project Structure

### Documentation (this feature)

```text
specs/016-volume-icon-slider/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-volume-control.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── player/
│   │   │   ├── VolumeControl.tsx          # NEW
│   │   │   └── AudioPlayer.tsx            # MODIFY: replace horizontal slider
│   │   └── layout/
│   │       ├── NowPlayingControlPanel.tsx # MODIFY: add VolumeControl + volume props
│   │       └── NowPlayingNav.tsx          # MODIFY: pass volume/setVolume
│   └── pages/
│       └── NowPlayingPage.tsx             # MODIFY: unchanged props via AudioPlayer
└── tests/
    └── unit/
        ├── VolumeControl.test.tsx         # NEW
        └── NowPlayingControlPanel.test.tsx  # MODIFY (if exists) or NEW
```

**Structure Decision**: Frontend-only presentation feature. Volume logic stays in `use-player.ts`; UI composition in a single reusable `VolumeControl` to satisfy FR-003 parity and avoid duplicating popover logic.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| `VolumeControl` wrapper component | Same popover+slider+icon behavior on two surfaces | Inlining twice in `AudioPlayer` and panel risks drift and breaks FR-003 parity |
| Radix Popover directly (vs shadcn `popover.tsx`) | Already installed; AccountWidget precedent | Raw `<div>` hover panel fails keyboard/outside-dismiss requirements |

Optional follow-up (not blocking): `npx shadcn@latest add popover` and refactor `VolumeControl` + `AccountWidget` to use `components/ui/popover.tsx`.

## Phase 0 & Phase 1 Artifacts

| Artifact | Status |
|----------|--------|
| [research.md](./research.md) | ✅ Complete |
| [data-model.md](./data-model.md) | ✅ Complete |
| [contracts/ui-volume-control.md](./contracts/ui-volume-control.md) | ✅ Complete |
| [quickstart.md](./quickstart.md) | ✅ Complete |
| Agent context (`.cursor/rules/specify-rules.mdc`) | ✅ Updated to this plan |

## Implementation Notes (for `/speckit-tasks`)

1. **VolumeControl**: Controlled Radix `Popover.Root`; trigger `Button` `size="icon"`; content contains vertical `Slider` (`orientation="vertical"`, height ~7rem); `side="top"` on `Popover.Content`.
2. **AudioPlayer**: Remove line 74 horizontal `Slider`; add `<VolumeControl volume={volume} onVolume={onVolume} />` below transport row or aligned per design.
3. **NowPlayingControlPanel**: Add `volume` / `onVolume` props; render `VolumeControl` in flex row with playback buttons; rely on `if (!open) return null` for FR-003b (document in tests).
4. **NowPlayingNav**: `const { volume, setVolume } = usePlayer()` (from context) and pass to panel.
5. **Tests**: Mock `onVolume`; assert `VolumeX` at 0; popover opens on click; `forceClosed` closes.
