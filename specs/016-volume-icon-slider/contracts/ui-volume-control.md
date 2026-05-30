# UI Contract: Volume Icon with Vertical Slider

**Feature**: 016-volume-icon-slider  
**Type**: Frontend UI/interaction contract (no HTTP API changes).

Defines observable behavior for the shared volume control and its integration points.

## Component: `VolumeControl`

**Location**: `frontend/src/components/player/VolumeControl.tsx` (new)

**Props**:

```ts
interface VolumeControlProps {
  /** Current output level 0–1 from usePlayer(). */
  volume: number;
  /** Persist and apply volume immediately (usePlayer.setVolume). */
  onVolume: (v: number) => void;
  /** When true, close any open popover (header panel dismissed). */
  forceClosed?: boolean;
  className?: string;
}
```

**Behavioral contract**:

| ID | Given | When | Then |
|----|-------|------|------|
| V1 | default | rendered | Trigger is an icon button only (no always-visible horizontal slider) (FR-001) |
| V2 | popover closed | user activates trigger | Vertical slider popover opens, portaled/absolute without shifting siblings (FR-002, FR-009) |
| V3 | popover open | user drags slider toward top | `onVolume` called with higher values; audible increase during play (FR-004, FR-006) |
| V4 | popover open | user drags toward bottom | `onVolume` called with lower values; at 0 playback silent (FR-006, FR-010) |
| V5 | popover open | outside click, Escape, or second trigger activation | Popover closes (FR-007) |
| V6 | `volume === 0` | rendered | Trigger shows muted/off icon (FR-010) |
| V7 | `volume > 0` | rendered | Trigger shows standard sound-on icon (FR-010) |
| V8 | popover open | rendered | Slider thumb position reflects `volume * 100` on 0–100 scale |
| V9 | `forceClosed=true` | any | Popover is closed |
| V10 | keyboard focus | Tab to trigger, Space/Enter | Opens popover; slider operable via keyboard (FR-008, SC-006) |

**Layout contract**:

- Slider orientation: vertical; **top = louder**, bottom = quieter (Assumptions).
- Popover preferred placement: `side="top"` relative to trigger to avoid clipping under header dropdown panel.

## Integration: `AudioPlayer`

**Location**: `frontend/src/components/player/AudioPlayer.tsx`

| ID | Given | When | Then |
|----|-------|------|------|
| A1 | player props include volume | rendered | Horizontal volume `Slider` is **removed**; `VolumeControl` used instead (FR-001) |
| A2 | user changes volume | `onVolume` fired | Same callback as prior horizontal slider |

## Integration: `NowPlayingControlPanel`

**Location**: `frontend/src/components/layout/NowPlayingControlPanel.tsx`

**Extended props** (additive):

```ts
interface NowPlayingControlPanelProps {
  // existing: open, current, playing, onToggle, onNext, onPrevious
  volume: number;
  onVolume: (v: number) => void;
}
```

| ID | Given | When | Then |
|----|-------|------|------|
| P1 | `open=true` | rendered | `VolumeControl` visible in control row with previous / play-pause / next (FR-003) |
| P2 | `open=false` | rendered | Panel not mounted; volume control not available in header (FR-003a) |
| P3 | `open` transitions true→false while volume popover open | panel closes | Volume popover closes (FR-003b) — satisfied by unmount or `forceClosed={!open}` |
| P4 | volume changed in panel | user opens Now Playing page volume | Same `volume` value shown (FR-004, SC-003) |

## Integration: `NowPlayingNav`

**Location**: `frontend/src/components/layout/NowPlayingNav.tsx`

| ID | Given | When | Then |
|----|-------|------|------|
| N1 | track loaded | panel open | Passes `player.volume` and `player.setVolume` into `NowPlayingControlPanel` |

## Hook dependency

`usePlayer()` (or `usePlaybackControls` extended) supplies `volume` / `setVolume` — no new hook required unless ergonomics favor a thin `useVolume()` re-export.
