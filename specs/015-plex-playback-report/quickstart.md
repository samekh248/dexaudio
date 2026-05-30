# Quickstart: Plex Playback Reporting

**Branch**: `015-plex-playback-report`

## Prerequisites

- Plex connected (Settings → Plex → Sign in).
- At least one music library selected.
- Playback reporting **enabled** (default) in Plex Settings.

## Manual verification

### 1. Now playing in Plex

1. Start Dexaudio backend + frontend.
2. Play a track for 30+ seconds.
3. Open Plex Web → **Activity** (or server dashboard “Now Playing”).
4. Confirm:
   - Track title matches what you hear.
   - Client shows **DexAudio**.

### 2. Pause / resume

1. Pause in Dexaudio → within 15 s Plex shows paused/stopped activity.
2. Resume → Plex shows playing again.

### 3. Skip

1. Skip to next track → previous session ends; new track appears as active within 15 s.

### 4. Reporting disabled

1. Plex Settings → turn off playback reporting.
2. Play 2 minutes → Plex Activity shows **no new** DexAudio session.
3. Re-enable → next play appears again.

### 5. Offline cache

1. Pin/play a cached track with Plex still configured.
2. Confirm Plex still receives timeline updates (same rating key).

### 6. Retry (optional)

1. Stop Plex server or block network briefly at track start.
2. Restore within 24 h → call **Retry reporting** in Plex Settings (or wait for auto flush).
3. Confirm play appears in Plex Recently Played.

## Automated tests (after implementation)

```bash
cd backend && npm test -- plex-timeline
cd frontend && npm test -- plex-playback-reporter
```

## Key files (planned)

| Area | Path |
|------|------|
| Plex timeline HTTP | `backend/src/services/plex/plex-timeline-service.ts` |
| Outbox | `backend/src/services/plex/plex-timeline-outbox.ts` |
| Routes | `backend/src/api/routes/plex.ts` (extend) |
| Reporter | `frontend/src/lib/plex-playback-reporter.ts` |
| Hook | `frontend/src/hooks/use-player.ts` |
| Settings UI | `frontend/src/components/settings/PlexSettingsSection.tsx` |
