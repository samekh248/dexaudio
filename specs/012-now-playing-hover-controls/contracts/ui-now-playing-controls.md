# UI Contract: Now Playing Hover Controls

**Feature**: 012-now-playing-hover-controls
**Type**: Frontend UI/interaction contract (no HTTP API; this app communicates with the backend only via existing REST endpoints, none of which change for this feature).

This contract defines the observable behavior and component interfaces for the header playback control panel. It is the basis for component unit tests.

## Component: `NowPlayingControlPanel`

**Location**: `frontend/src/components/layout/NowPlayingControlPanel.tsx`

**Props**:

```ts
interface NowPlayingControlPanelProps {
  /** Whether the panel is currently visible. */
  open: boolean;
  /** Current track; panel content requires a non-null track to render. */
  current: Track;
  /** Live playing state from the player engine. */
  playing: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
}
```

**Behavioral contract**:

| ID | Given | When | Then |
|----|-------|------|------|
| C1 | `open=true`, `current` set | rendered | Panel is positioned beneath the trigger as an absolute overlay; no sibling layout shifts (FR-002) |
| C2 | `open=true`, `playing=true` | user activates play/pause control | `onToggle` called once; icon shows "pause" affordance (FR-006) |
| C3 | `open=true`, `playing=false` | user activates play/pause control | `onToggle` called once; icon shows "play" affordance (FR-006) |
| C4 | `open=true` | user activates next control | `onNext` called once (FR-007) |
| C5 | `open=true` | user activates previous control | `onPrevious` called once (FR-008) |
| C6 | `open=true` | rendered | Marquee shows `"{artist} - {title}"`; controls show icons only with no visible text labels by default (FR-004, FR-009) |
| C7 | `open=true` | pointer/focus over a single control icon | Only that control's text label becomes visible; others remain hidden (FR-005) |
| C8 | any | rendered | Each control has a stable `aria-label` (previous / play or pause / next) (FR-015, SC-006) |
| C9 | `open=false` | rendered | Panel content is not visible/perceivable |

## Component: `TrackMarquee`

**Location**: `frontend/src/components/player/TrackMarquee.tsx`

**Props**:

```ts
interface TrackMarqueeProps {
  text: string;
  className?: string;
}
```

**Behavioral contract**:

| ID | Given | When | Then |
|----|-------|------|------|
| M1 | text wider than container, `motion-safe` | mounted | Text scrolls horizontally in a continuous loop (FR-010) |
| M2 | text fits within container | mounted | Text is static (no animation) (FR-010) |
| M3 | `prefers-reduced-motion: reduce` | mounted | No scrolling animation regardless of width (FR-015) |
| M4 | `text` prop changes | track changes | Rendered text updates to the new value (FR-011) |

## Hook: `use-playback-controls`

**Location**: `frontend/src/hooks/use-playback-controls.ts`

**Signature**:

```ts
function usePlaybackControls(): {
  current: Track | null;
  playing: boolean;
  toggle: () => void;
  next: () => void;
  previous: () => void;
};
```

**Contract**:

| ID | Behavior |
|----|----------|
| H1 | `next`/`previous` reproduce `NowPlayingPage` semantics including gapless handoff and fade-out (FR-007, FR-008) |
| H2 | `toggle` pauses when playing, resumes when paused, and resumes autoplay when autoplay was blocked (FR-006) |
| H3 | `playing` mirrors the live `usePlayer().playing` value (SC-005) |
| H4 | `current` is `null` when the queue has no active track (FR-014) |

## Hook: `use-hover-intent`

**Location**: `frontend/src/hooks/use-hover-intent.ts`

**Contract**:

| ID | Behavior |
|----|----------|
| V1 | Opens on `pointerenter` and on `focusin` within the trigger/panel region (FR-012, FR-012a) |
| V2 | Closes on `pointerleave` of both regions after a short grace delay to avoid flicker across the gap (Edge Case: pointer transition gap) |
| V3 | Closes on `focusout` of both regions (FR-012a) |
| V4 | On touch, opens after a press-and-hold threshold and suppresses navigation; a short tap does not open and allows navigation (FR-012b, FR-013) |

## Integration contract: `AppShell`

| ID | Behavior |
|----|----------|
| A1 | The existing Now Playing `Link` still navigates to `/now-playing` on normal activation (FR-013) |
| A2 | When there is no current track, no panel is mounted/armed (FR-014) |
| A3 | Panel mounting/visibility changes cause zero layout movement of header or main content (SC-002) |
