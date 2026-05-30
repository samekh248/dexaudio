# Phase 0 Research: Volume Icon with Vertical Slider

**Feature**: 016-volume-icon-slider  
**Date**: 2026-05-30

## R1: Popover pattern for icon-triggered volume slider

**Decision**: Implement a shared `VolumeControl` using `@radix-ui/react-popover` (already a project dependency via `AccountWidget`) with Tailwind styling consistent with existing overlays.

**Rationale**: Constitution prefers shadcn/ui, but the repo has no `components/ui/popover.tsx` yet. Adding a one-off custom popover duplicates AccountWidget. Radix Popover is already installed and supports controlled `open`, outside dismiss, and portal positioning required for FR-007/FR-009. A follow-up can wrap this in a shadcn Popover CLI component without changing behavior.

**Alternatives considered**:
- **shadcn Popover CLI add** — Preferred long-term; deferred to implementation to avoid plan-time file churn; same Radix primitive underneath.
- **CSS-only hover reveal** — Fails keyboard/touch requirements (FR-008) and toggle-dismiss spec.
- **Dialog/modal** — Too heavy; blocks interaction and reflow risk.

## R2: Vertical slider implementation

**Decision**: Reuse existing shadcn `Slider` (`@radix-ui/react-slider`) with `orientation="vertical"`, `className` overrides (`flex-col h-28 w-8` or similar), `value={[volume * 100]}`, `max={100}`, `onValueChange` → `setVolume(v/100)`.

**Rationale**: Horizontal slider already drives volume in `AudioPlayer`; vertical is the same primitive with orientation and dimensions changed. No new dependency.

**Alternatives considered**:
- **Native `<input type="range" orient="vertical">`** — Poor cross-browser styling; breaks shadcn consistency.
- **Separate volume stepper buttons** — Does not match spec’s slider requirement.

## R3: Muted icon state

**Decision**: `VolumeX` (or equivalent) when `volume === 0`; `Volume2` when `volume > 0`. Threshold is exact zero per clarification (not a low-volume band).

**Rationale**: Matches FR-010 and avoids ambiguous “low” thresholds in tests.

## R4: Header panel lifecycle coupling

**Decision**: `VolumeControl` accepts optional `forceClosed?: boolean` (or parent resets `open` via `key`/effect). `NowPlayingControlPanel` passes `forceClosed={!open}` so when `useHoverIntent` sets `open=false`, volume popover state resets (FR-003b).

**Rationale**: Panel unmounts when `open=false` today (`if (!open) return null`), which already destroys child state; implementation MUST ensure volume popover is inside the panel subtree so unmount closes it. Document in contract rather than global store.

**Alternatives considered**:
- **Global Zustand for volume popover** — Unnecessary; panel mount scope is sufficient if volume UI lives inside panel component.

## R5: Data and API surface

**Decision**: No backend or shared-types changes. Volume continues via `usePlayer().volume` / `setVolume` and `StorageKeys.volume` in `local-storage.ts`.

**Rationale**: Spec scope is presentation only (Assumptions). FR-005 already satisfied by existing hook.

## R6: Popover placement

**Decision**: Popover content opens **above** the trigger (`side="top"`) with `sideOffset` so the vertical slider does not collide with the header panel that drops below the Now Playing button.

**Rationale**: Header panel is `top-full` below trigger; upward popover keeps slider visible and supports SC-005 (no layout shift). Now Playing page uses the same component for consistency.

**Alternatives considered**:
- **Open downward** — Risk clipping below fold inside compact panel.
