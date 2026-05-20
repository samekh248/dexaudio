# Quickstart: Gapless Playback (Feature 005)

## What This Feature Does

Adds an opt-in **Gapless playback** toggle in Settings. When enabled:

- Up to four queue neighbors are pre-cached in priority order (next → previous → 2nd ahead → 2 behind).
- The player stages a preloaded `Howl` for the next track so forward transitions can start in &lt;50 ms when preparation succeeds.
- Crossfade and gapless cannot run together (turning one on disables the other with a toast).
- Preparation failures degrade silently (no gapless-specific toast).

Depends on feature **004** (song playback) working.

## Prerequisites

- Features 001–004 implemented; Plex connected with a multi-track queue
- Node.js 22 LTS; `npm install` at repo root

## Dev Setup

```bash
cd backend && npm run dev &
cd frontend && npm run dev &
```

No new env vars. No DB migrations. No new npm packages.

## Key Files

| File | Role |
|------|------|
| `frontend/src/lib/pre-cache-worker.ts` | Extend with bidirectional priority pre-cache |
| `frontend/src/lib/cache-lru.ts` | Protected-key-aware eviction |
| `frontend/src/lib/cache-service.ts` | `ensurePreCacheSpace` with protected keys |
| `frontend/src/hooks/use-player.ts` | Staged Howl + gapless handoff on end/Next/Previous |
| `frontend/src/pages/NowPlayingPage.tsx` | Wire gapless `onend`, trigger neighbor pre-cache |
| `frontend/src/components/settings/PlaybackSettingsSection.tsx` | Gapless toggle + crossfade mutex |
| `frontend/src/lib/local-storage.ts` | `StorageKeys.gaplessPlayback` |

## Manual Smoke Test

1. Open **Settings → Playback**; confirm **Gapless playback** toggle (default off).
2. Enable gapless; if crossfade was on, confirm it turns off with a toast.
3. Play an album with 3+ tracks; let track 1 play to natural end — track 2 should start with no audible gap.
4. Press **Next** mid-track — same seamless handoff to the following track.
5. Press **Previous** back to a track that was recently played — should be seamless if pre-cached (may gap on immediate jump otherwise; silent, no toast).
6. Disable gapless; replay — transitions should match pre-feature behavior (small gap acceptable).
7. Fill pre-cache near cap (large FLACs, low cap in Settings → Storage); confirm playback still advances and pinned tracks remain.

## Automated Tests

```bash
cd frontend && npm test
```

Expected new/updated suites:

- `pre-cache-gapless-priority.test.ts` — slot ordering and index filtering
- `cache-lru-protected.test.ts` — eviction prefers non-protected keys
- `use-player-gapless-handoff.test.ts` — staged promote vs fallback (mocked Howl)

## Success Criteria Check

| ID | Quick check |
|----|-------------|
| SC-001 | 10-track playlist: ≥9/10 forward transitions without perceptible gap |
| SC-002 | Median end→start &lt;50 ms on same playlist (devtools / test harness) |
| SC-003 | Gapless off: same playlist, baseline gap unchanged |
| SC-004 | Toggle found and persists after reload |
| SC-005 | Enable gapless with crossfade on → crossfade off + understandable toast |
