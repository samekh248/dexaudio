# Phase 1 Data Model: Now Playing Hover Controls

**Feature**: 012-now-playing-hover-controls
**Date**: 2026-05-29

This feature introduces **no persisted data** and **no new API/database entities**. It consumes existing in-memory client state. The "entities" below are view-model shapes derived from existing stores, documented for clarity of the component contract.

## Derived View Models (client-only, transient)

### NowPlayingControlState

Derived from `usePlayer()` and `usePlaybackQueue()`; consumed by `NowPlayingControlPanel` via the `use-playback-controls` hook.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `current` | `Track \| null` | `getQueueCurrentTrack(queue)` | When `null`, panel is not shown (FR-014) |
| `playing` | `boolean` | `usePlayer().playing` | Drives play/pause icon + `aria-pressed` (FR-006, SC-005) |
| `toggle` | `() => void` | hook | Play/pause respecting autoplay-blocked + restore phase |
| `next` | `() => void` | hook | Mirrors NowPlayingPage `onNext` (gapless handoff / fade) (FR-007) |
| `previous` | `() => void` | hook | Mirrors NowPlayingPage `onPrevious` (first-track restart) (FR-008) |

### MarqueeContent

Derived value passed to `TrackMarquee`.

| Field | Type | Derivation | Notes |
|-------|------|-----------|-------|
| `text` | `string` | `[current.artist, current.title].filter(Boolean).join(" - ")` | Missing artist or title omits the stray separator (Edge Case: missing metadata) (FR-009, FR-011) |
| `shouldScroll` | `boolean` | measured: content width > container width AND `motion-safe` | Static when it fits or reduced-motion preferred (FR-010, FR-015) |

### PanelVisibilityState

Managed by `use-hover-intent`.

| Field | Type | Notes |
|-------|------|-------|
| `open` | `boolean` | True while pointer over button/panel, focus within button/panel, or active touch long-press |
| `openReason` | `'hover' \| 'focus' \| 'touch' \| null` | For disambiguating tap vs long-press and close behavior |

## State Transitions: Panel visibility

```text
closed --(pointerenter button/panel)--> open(hover)
closed --(focusin button/panel)-------> open(focus)
closed --(pointerdown touch + hold ≥400ms)--> open(touch)
open   --(pointerleave both, after ~120ms grace)--> closed
open   --(focusout both)--------------> closed
open(touch) --(touch release away)----> closed
closed --(tap, no hold)--------------> navigate to /now-playing (no panel)
* any --(current becomes null)--------> closed (and triggers disarmed)
```

## Validation / Behavior Rules

- **R1**: Panel renders only when `current !== null` (FR-014).
- **R2**: `playing` must always reflect the live player engine value; no local optimistic copy (SC-005).
- **R3**: Marquee text never renders a leading/trailing/standalone " - " when artist or title is absent.
- **R4**: `shouldScroll` is false whenever `prefers-reduced-motion: reduce` (FR-015).
- **R5**: Every control exposes a stable accessible name (`aria-label`) independent of the visual hover-label state (FR-004, FR-005, SC-006).
- **R6**: A normal tap/click on the button still navigates to `/now-playing` (FR-013).

## Relationships

```text
usePlaybackQueue ──┐
                   ├─> use-playback-controls ──> NowPlayingControlPanel ──> TrackMarquee
usePlayer ─────────┘                                     ▲
use-hover-intent ────────────────────────────────────────┘ (visibility)
```

No database tables, migrations, or API schemas are added or changed.
