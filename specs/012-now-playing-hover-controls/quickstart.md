# Quickstart: Now Playing Hover Controls

**Feature**: 012-now-playing-hover-controls

## Prerequisites

- Repo cloned; on branch `012-now-playing-hover-controls`
- Node.js LTS installed
- From `frontend/`: `npm install` (no new dependencies are required for this feature)

## Run locally

```bash
cd frontend
npm run dev
```

1. Start playing a track (open an album and play, or use any existing play action).
2. In the header, move your pointer over the **Now Playing** button.
3. A control panel appears directly beneath it — a looping marquee of "{artist} - {track}" above three icon controls: previous, play/pause, next.
4. Hover a single icon to reveal only that control's text label.
5. Move the pointer away — the panel disappears with no layout shift.

## Manual verification checklist

| Check | Expected | Spec ref |
|-------|----------|----------|
| Hover Now Playing button (track loaded) | Panel opens beneath button | FR-001 |
| Panel open/close | No surrounding content moves or resizes | FR-002, SC-002 |
| Three controls present | previous, play/pause, next as icons only | FR-003, FR-004 |
| Hover one icon | Only that icon's label appears | FR-005, SC-003 |
| Click play/pause | Toggles playback; icon reflects state | FR-006, SC-005 |
| Click next / previous | Advances / goes back per existing queue behavior | FR-007, FR-008 |
| Marquee text | Shows "{artist} - {track}", scrolls when overflowing | FR-009, FR-010 |
| Change track while open | Marquee updates | FR-011 |
| Keyboard: Tab to Now Playing button | Panel opens on focus; controls reachable + announced | FR-012a, FR-015, SC-006 |
| Touch: press-and-hold button | Panel opens; a normal tap navigates to Now Playing | FR-012b, FR-013 |
| No track loaded | Panel does not open at all | FR-014 |
| OS reduced-motion enabled | Marquee does not animate | FR-015 |

## Run tests

```bash
cd frontend
npm test
```

Relevant unit tests (added by this feature):

- `tests/unit/NowPlayingControlPanel.test.tsx`
- `tests/unit/TrackMarquee.test.tsx`
- `tests/unit/use-playback-controls.test.tsx`

## Key files

- `src/components/layout/AppShell.tsx` — wraps the Now Playing link with the panel + hover intent
- `src/components/layout/NowPlayingControlPanel.tsx` — overlay panel (marquee + controls)
- `src/components/player/TrackMarquee.tsx` — looping marquee
- `src/hooks/use-playback-controls.ts` — shared play/pause/next/previous logic
- `src/hooks/use-hover-intent.ts` — hover/focus/press-and-hold open-close logic
- `tailwind.config.js` — marquee keyframes/animation
