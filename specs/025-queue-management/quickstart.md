# Quickstart: Queue Management

Manual verification on branch `025-queue-management` after implementation.

## Prerequisites

- Dev server: `npm run dev` from `frontend/` (or workspace root per project convention).
- Library connected with a multi-track album or playlist (include at least one FLAC/ALAC track if testing lossless lead).
- Playback settings reachable (Settings → Playback).

## 1. Played / upcoming split (P1)

1. Queue 5+ tracks; start playback on track 2.
2. Let track 2 finish (or skip to track 3).
3. Open Now Playing queue panel.
4. **Expect**: Up to three tracks above a separator (played); current + rest below.
5. Play through until 4+ tracks have passed.
6. **Expect**: Played section shows only the **three** tracks immediately before current (not the full history).

## 2. Re-anchor (P1)

1. With 5 tracks, advance to track 4.
2. In played section, tap track 2 (visible in the three-row window).
3. **Expect**: Track 2 becomes current; tracks 3+ are upcoming again; playback loads track 2.

## 3. Reorder upcoming (P1)

1. Start on track 2 of 5.
2. Drag track 5 to position after current (before old track 3).
3. **Expect**: Current keeps playing track 2; order updates; next advance follows new order.
4. Try dragging the current row — **expect** no drag affordance.

## 4. Remove controls (P1)

1. **Expect** remove (X) on current and upcoming, not on played rows.
2. Remove current track — **expect** existing advance/stop behavior.

## 5. Buffer bar (P2)

1. Set prep depth to 3 in Playback settings.
2. Play track 1 of a lossless queue; watch row for track 2.
3. **Expect**: Thin progress bar grows on next row during load; completes before transition.

## 6. Preparation depth setting (P2)

1. Set depth to **1**; play through — only next row should show prep activity.
2. Set depth to **5**; with 6+ tracks queued, up to five upcoming rows may show prep (resource permitting).

## 7. Lossless handoff (P2)

1. Queue 3 consecutive FLAC tracks on Wi-Fi.
2. Play through without skipping.
3. **Expect**: Gap to next track ≤ ~500 ms (informal); buffer bar on next row reaches full before advance.

## Automated tests

```bash
cd frontend && npm test -- queue-display queue-prep playback-orchestrator.prep QueuePanel
```

## Regression checks

- Queue persistence across reload (`010`) still works.
- Gapless/crossfade handoff (`014`) still promotes staged forward track.
- Lossless preference (`020`) still respected during staged `resolveStagedTrackSrc`.
