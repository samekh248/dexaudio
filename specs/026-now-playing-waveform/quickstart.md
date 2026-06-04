# Quickstart: Now Playing Waveform

**Branch**: `026-now-playing-waveform`

Manual verification after implementation. Requires Plex music library with **loudness analysis** completed for test tracks (Plexamp-style analysis; tracks added before analysis may need library refresh / re-analysis).

## Prerequisites

1. Plex connected in Dexaudio settings.
2. At least one track known to show waveform in Plexamp (same server).
3. Checkout branch `026-now-playing-waveform`.

## 1. Waveform appears (P1)

1. Play a track with loudness data from any library view.
2. Open **Now Playing**.
3. **Pass**: Waveform bars appear **above** the seek slider (~64px tall), accent color left of playhead, muted right.
4. **Pass**: No empty band while loading; slider visible immediately.

## 2. Sync during playback (P1)

1. Let track play 30+ seconds.
2. **Pass**: Color boundary moves with playback; within ~1s of slider thumb.
3. Pause.
4. **Pass**: Boundary frozen until resume.

## 3. Click-to-seek & hover (P2)

1. Hover mid-waveform (mouse).
2. **Pass**: Tooltip shows target time; audio position unchanged.
3. Click near end of waveform.
4. **Pass**: Playback jumps; waveform and slider align.
5. Drag across waveform without releasing on progress bar.
6. **Pass**: No scrub from waveform drag alone.
7. Drag **progress bar**.
8. **Pass**: Waveform split still matches.

## 4. Missing waveform (P1)

1. Play a track without Plex loudness (or very old untested file).
2. **Pass**: No waveform; layout matches pre-feature (no gap).
3. **Pass**: Slider and transport work normally.

## 5. Track change (P3)

1. Play track A (with waveform), then skip to B (without), then C (with).
2. **Pass**: Never see A’s shape on B/C for more than ~1s.
3. **Pass**: B shows slider only; C shows new shape.

## 6. Remote / seek disabled (if applicable)

1. Cast to a player that disables seek (existing network mode).
2. **Pass**: Waveform not clickable; no hover time preview; slider also disabled.

## 7. Accessibility smoke

1. Tab to seek slider with keyboard.
2. **Pass**: Slider operable; waveform not required for seek (supplementary / `aria-hidden`).

## API smoke (optional)

```bash
curl -s "http://localhost:3000/api/v1/library/tracks/{TRACK_ID}/waveform" | jq .
```

**Pass**: 200 with `samples` array, or 404 `waveform_unavailable` for tracks without analysis.
