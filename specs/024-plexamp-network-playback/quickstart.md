# Quickstart: Network Plex Music Player Playback

**Branch**: `024-plexamp-network-playback`

## Prerequisites

- Plex connected (Settings → Plex).
- At least one **Plex music player** on the same LAN (Plexamp, Plex Web, etc.) with **remote control** enabled.
- DexAudio frontend + backend running.

## Manual verification

### 1. Discover players

1. Open **Now Playing** → playback output selector.
2. Within 10 s, confirm **This device** plus at least one network player with **name** and **product** label.
3. Tap **Refresh** — list updates.

### 2. Play on network player

1. Select **Living Room Plexamp** (or your player).
2. Play a track from the library.
3. Confirm audio on the **physical player**, not the browser tab.
4. Confirm Now Playing metadata matches the remote track.

### 3. Queue sync

1. Build a 3-track queue; play first track on network output.
2. Let track 1 end — track 2 starts on the remote player without pressing play.
3. Reorder upcoming rows — remote queue matches within 5 s; current track keeps playing.

### 4. Switch to This device (stop remote)

1. While remote is playing, select **This device**.
2. Remote audio stops within 2 s.
3. Press play — audio from browser only.

### 5. Plex activity (no duplicate DexAudio)

1. Listen 30+ s on network output.
2. Plex Activity shows the **remote player** (e.g. Plexamp), not a parallel DexAudio session.

### 6. last.fm (if connected)

1. Play qualifying track on network output.
2. Confirm scrobble still submits from DexAudio per existing rules.

### 7. Bi-directional sync

1. Pause on the Plexamp device.
2. Within 5 s, DexAudio Now Playing shows paused.

## Automated tests (after implementation)

```bash
npm run test -w backend -- plex-players
npm run test -w backend -- plex-remote
npm run test -w frontend -- playback-output
npm run test -w frontend -- network-playback-orchestrator
```
