# Quickstart: Play Navigation Preference (Feature 013)

## What This Feature Does

**Settings → Playback → When starting playback**:

- **Go to Now Playing** (default) — play-now opens `/now-playing`.
- **Stay on current page** — play-now starts audio without route change; no toast; header visualizer shows playing state.

Applies to all `usePlayNow` callers (track, album, artist, future search). Session restore on reload never auto-navigates.

## Prerequisites

- Play-now / queue flows (004+)
- Node.js 22 LTS; `npm install` at repo root

## Dev Setup

```bash
cd backend && npm run dev &
cd frontend && npm run dev &
```

## Key Files

| File | Role |
|------|------|
| `frontend/src/hooks/use-play-now.ts` | Conditional navigate; no toast |
| `frontend/src/lib/local-storage.ts` | `StorageKeys.playNavigation`, getter |
| `frontend/src/components/settings/PlaybackSettingsSection.tsx` | Radio group |
| `frontend/src/components/ui/radio-group.tsx` | shadcn CLI |
| `frontend/src/lib/playback-bootstrap.ts` | **Unchanged** — no restore navigation |

## Manual Smoke Test

1. **Settings → Playback** — two options; default **Go to Now Playing**.
2. **Stay on current page** — play album from library; URL unchanged; audio plays; header shows visualizer; **no toast**.
3. **Album detail → Play now** — stay mode keeps you on album page.
4. **Go to Now Playing** — repeat; lands on `/now-playing`.
5. **Add to queue** — no navigation in either mode.
6. **Header Now Playing link** — manual navigation works in stay mode.
7. **Reload with active session** — music may resume; route stays on landing page (not forced to `/now-playing`).

## Automated Tests

```bash
cd frontend && npm test
```

- `use-play-now.test.tsx` — navigate only when `navigate`; no toast spy calls in `stay`
- `use-play-album.test.tsx` — update per mode

## Success Criteria Check

| ID | Quick check |
|----|-------------|
| SC-001 | Stay mode: all hook play-now — route unchanged |
| SC-002 | Navigate mode: all hook play-now — `/now-playing` |
| SC-003 | Preference persists after reload |
| SC-005 | Add to queue never navigates |
| FR-010 | Session restore does not navigate |
