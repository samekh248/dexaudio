# Quickstart: Volume Icon with Vertical Slider

**Feature**: 016-volume-icon-slider

## Prerequisites

- Branch `016-volume-icon-slider` checked out
- Node.js LTS; from repo root or `frontend/`: `npm install`
- No backend or database migrations for this feature

## Run locally

```bash
cd frontend
npm run dev
```

### Now Playing page

1. Play a track and open **Now Playing**.
2. Confirm there is **no** always-visible horizontal volume bar.
3. Click the **sound icon** — a **vertical** slider appears above/near the icon.
4. Drag up/down — volume changes audibly during playback.
5. Click outside or the icon again — slider closes.

### Header playback panel

1. With a track playing, hover/focus the header **Now Playing** control to open the panel.
2. Confirm a sound icon appears beside previous / play-pause / next.
3. Open the vertical slider and change volume.
4. Close the panel (pointer leave / blur) — volume slider must close with it.
5. Open **Now Playing** page volume — level matches what you set in the header.

## Manual verification checklist

| Check | Expected | Spec ref |
|-------|----------|----------|
| Now Playing: no horizontal volume bar | Icon only until opened | FR-001 |
| Vertical slider on icon click | Opens above trigger; top=louder | FR-002, Assumptions |
| Header: volume in open panel only | No icon when panel closed | FR-003a |
| Header: panel closes with slider open | Slider closes too | FR-003b |
| Volume 0 | Muted/off icon | FR-010 |
| Volume > 0 | Sound-on icon | FR-010 |
| Keyboard: Tab + activate + adjust | Works without mouse | FR-008, SC-006 |
| Reload app | Volume persists | FR-005, SC-004 |
| Open/close slider | No layout jump | FR-009, SC-005 |

## Run tests

```bash
cd frontend
npm test
```

Expected new/updated tests:

- `tests/unit/VolumeControl.test.tsx` — popover toggle, icon state at 0 vs >0, `onVolume` calls
- `tests/unit/NowPlayingControlPanel.test.tsx` — volume control present when open; absent when closed
