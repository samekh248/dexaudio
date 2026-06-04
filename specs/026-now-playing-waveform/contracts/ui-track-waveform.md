# UI Contract: Track Waveform (Now Playing)

**Feature**: 026-now-playing-waveform  
**Type**: Frontend UI contract (uses new REST endpoint above).

## Component: `TrackWaveform`

**Location**: `frontend/src/components/player/TrackWaveform.tsx` (new)

**Props**:

```ts
interface TrackWaveformProps {
  trackId: string;
  positionMs: number;
  durationMs: number;
  seekDisabled?: boolean;
  onSeek: (ms: number) => void;
  className?: string;
}
```

**Behavioral contract**:

| ID | Given | When | Then |
|----|-------|------|------|
| W1 | waveform data loading | rendered | Nothing mounted in waveform slot (no skeleton, zero height) (FR-009, SC-003) |
| W2 | `status=ready` | rendered | Bar chart ~56–72px tall, full width of parent, `aria-hidden="true"` (FR-001, FR-011, FR-010) |
| W3 | `ready`, position advancing | playback ticks | Played bars use accent/highlight; unplayed use muted styling (FR-003, FR-004) |
| W4 | `ready`, `seekDisabled=false` | pointer hover | Tooltip shows target time at hover ratio without seeking (FR-012) |
| W5 | `ready`, `seekDisabled=false` | click at ratio *r* | `onSeek(round(r * durationMs))` once (FR-006) |
| W6 | `ready`, `seekDisabled=false` | pointer drag across bars | No continuous seek; position unchanged until click (clarification) |
| W7 | `ready`, `seekDisabled=true` | hover or click | No tooltip seek preview; no seek; cursor default (FR-006, FR-012) |
| W8 | `trackId` changes | new id | Previous bars cleared immediately; W1 until new data ready (FR-005, SC-005) |
| W9 | fetch 404/unavailable | rendered | Stays hidden; progress bar unaffected (FR-002) |
| W10 | `prefers-reduced-motion: reduce` | position updates | Played boundary updates without transition animation |

**Layout contract**:

- Rendered **above** the seek `Slider` inside `AudioPlayer` (or wrapper), same horizontal padding/width as slider row.
- Colors: `hsl(var(--now-playing-highlight))` played, muted foreground token unplayed (theme-safe).

## Hook: `useTrackWaveform`

**Location**: `frontend/src/hooks/use-track-waveform.ts` (new)

```ts
function useTrackWaveform(trackId: string | undefined): {
  status: "idle" | "loading" | "ready" | "unavailable" | "error";
  waveform: TrackWaveform | null;
};
```

| ID | Given | When | Then |
|----|-------|------|------|
| H1 | `trackId` undefined | — | `idle`, null waveform |
| H2 | `trackId` set | mount/change | `loading` then `ready` or `unavailable` |
| H3 | same `trackId` within session | remount | May serve from in-memory cache without flicker |

## Integration: `AudioPlayer`

**Location**: `frontend/src/components/player/AudioPlayer.tsx`

| ID | Given | When | Then |
|----|-------|------|------|
| A1 | `trackId` prop provided | rendered | `TrackWaveform` above seek slider; slider unchanged as primary a11y control |
| A2 | `seekDisabled` on player | remote restrictions | Passed to `TrackWaveform` |

**Extended props** (additive):

```ts
trackId?: string; // when set, enables waveform block above slider
```

## Integration: `NowPlayingPage`

Passes `trackId={current.id}` into `AudioPlayer` with existing position/seek props.

## Tests (frontend unit)

- Normalizes click x → seek ms.
- Drag does not call `onSeek`.
- `seekDisabled` blocks click/hover preview.
- Unavailable fetch renders null.
- Played index tracks `positionMs / sampleIntervalMs`.
