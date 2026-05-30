# Phase 0 Research: Now Playing Hover Controls

**Feature**: 012-now-playing-hover-controls
**Date**: 2026-05-29

This document resolves the open technical decisions for implementing a hover/focus/touch-triggered playback control panel anchored to the header "Now Playing" button. All decisions favor zero new dependencies (Constitution Principle V).

## Decision 1: Panel anchoring & no-reflow overlay

- **Decision**: Render the panel as an absolutely-positioned overlay inside a `relative` wrapper around the existing Now Playing `Link`, positioned beneath the button (`top-full`) and right-aligned to the header edge. Use a high `z-index` consistent with the header (`z-50`+) and Tailwind utilities for positioning/visibility.
- **Rationale**: Absolute positioning removes the panel from normal flow, guaranteeing surrounding content never shifts or resizes (FR-002, SC-002). Anchoring to a `relative` wrapper keeps it visually tied to the button regardless of header width.
- **Alternatives considered**:
  - shadcn/Radix `Popover` — installed as a dependency but not as a component; it is click-triggered and would need custom hover wiring anyway. Rejected to avoid scaffolding a click-oriented primitive for a hover-first interaction.
  - `@radix-ui/react-hover-card` — purpose-built but not installed; adding it violates Principle V. Rejected.
  - Portal to `document.body` — unnecessary; the header is already `fixed` and not clipped, so an in-header overlay suffices and keeps focus management simpler.

## Decision 2: Open/close trigger semantics (hover + keyboard + touch)

- **Decision**: Implement a small `use-hover-intent` hook that opens on `pointerenter`/`focusin` and closes on `pointerleave`/`focusout`, with a short close grace delay (~120ms) to bridge the pointer gap between button and panel. For touch, open on long-press (`pointerdown` + ~400ms timer, `pointerType === 'touch'`) and suppress the navigation tap when a long-press fires; a normal tap still navigates (FR-013, FR-012/012a/012b).
- **Rationale**: A single hook centralizes the three input modalities and the anti-flicker grace period (Edge Case: pointer transition gap). Using `focusin`/`focusout` (which bubble) lets focus anywhere within the button or panel keep it open.
- **Alternatives considered**:
  - CSS-only `:hover`/`group-hover` open — simplest for pointer, but cannot express keyboard-focus-open + touch long-press + tap-vs-hold disambiguation. Rejected as insufficient for accessibility/touch requirements.
  - Separate handlers scattered across components — harder to keep the grace-delay and tap/hold logic consistent. Rejected for maintainability.

## Decision 3: Reusing playback actions (no logic duplication)

- **Decision**: Extract a `use-playback-controls` hook that returns `{ playing, toggle, next, previous, current }`, encapsulating the exact gapless-handoff/fade logic currently inline in `NowPlayingPage` (`onNext`/`onPrevious`/play-pause). `NowPlayingPage` and the new panel both consume it.
- **Rationale**: Guarantees identical edge behavior (first-track previous restarts, gapless handoff, fade-out) across both surfaces (FR-007, FR-008, Assumptions) and prevents drift. Reads `playing` from `usePlayer()` and queue actions from `usePlaybackQueue`.
- **Alternatives considered**:
  - Duplicate the inline logic in the panel — fast but risks divergence and double-maintenance. Rejected.
  - Move logic into the player context — larger blast radius than needed for this feature. Deferred; a hook is the minimal change.

## Decision 4: Marquee implementation

- **Decision**: `TrackMarquee` measures content vs container width (ResizeObserver / offsetWidth comparison). When content overflows, render duplicated text and apply a CSS keyframe `marquee` animation (translateX 0 → -50%) for a seamless continuous loop (FR-010). When it fits, render static text. Add `marquee` keyframes + `animate-marquee` to `tailwind.config.js`.
- **Rationale**: Pure CSS animation is GPU-friendly (60fps) and requires no library. Duplicated-content technique yields a gapless wrap-around loop.
- **Alternatives considered**:
  - JS requestAnimationFrame scrolling — more control but more CPU and code. Rejected; CSS is sufficient.
  - `<marquee>` element — deprecated, non-accessible. Rejected.

## Decision 5: Reduced-motion handling

- **Decision**: Gate the looping animation behind `prefers-reduced-motion: no-preference`. When reduced motion is preferred, show static, non-animated text (truncated with accessible full value available), satisfying FR-015 and the reduced-motion edge case.
- **Rationale**: WCAG 2.1 AA / Constitution IV. Tailwind's `motion-safe:`/`motion-reduce:` variants express this declaratively.
- **Alternatives considered**: Always animate — fails accessibility. Rejected.

## Decision 6: Per-icon label reveal & accessibility

- **Decision**: Each control is an icon `Button` (icon size) with a visible text label that is hidden by default and revealed only for the hovered/focused icon using Tailwind `group`/`group-hover`/`group-focus` (or per-button `peer`/local hover state). Every control also has a persistent `aria-label` so assistive tech always announces it regardless of visual label state (FR-004, FR-005, FR-015, SC-006).
- **Rationale**: Separates visual affordance (hover reveals label) from the accessibility name (always present), meeting both UX and a11y requirements without a tooltip dependency.
- **Alternatives considered**:
  - Native `title` attribute — inconsistent timing/styling and poor a11y semantics. Rejected.
  - Tooltip library — new dependency, violates Principle V. Rejected.

## Decision 7: Empty-state (no active track)

- **Decision**: The panel and its triggers are only mounted/armed when `current` track exists. With no active track, the Now Playing button keeps only its navigation behavior and no panel opens (FR-014).
- **Rationale**: Avoids presenting non-functional controls; matches clarified behavior.
- **Alternatives considered**: Disabled panel — rejected per clarification (do not show panel at all).

## Decision 8: Play/pause state synchronization

- **Decision**: Derive the play/pause icon and `aria-pressed`/label from the live `player.playing` value from `usePlayer()`, so rapid toggles/skip stay in sync (FR-006, SC-005). Reuse the existing autoplay-blocked handling (`resumeAutoplay`) when applicable.
- **Rationale**: Single source of truth from the player engine prevents stale UI.
- **Alternatives considered**: Local optimistic state — risks desync on engine-driven changes. Rejected.

## Summary of resolved unknowns

| Topic | Resolution |
|-------|-----------|
| Overlay without reflow | Absolute-positioned in-header overlay |
| Multi-modal open/close | `use-hover-intent` hook (hover/focus/long-press + grace delay) |
| Action reuse | `use-playback-controls` hook shared with NowPlayingPage |
| Marquee | CSS keyframe loop with duplicated content, overflow-gated |
| Reduced motion | `motion-safe`/`motion-reduce` static fallback |
| Per-icon labels + a11y | `group`-based reveal + persistent `aria-label` |
| Empty state | Panel not mounted when no current track |
| Play/pause sync | Derived from live `player.playing` |

No NEEDS CLARIFICATION items remain.
