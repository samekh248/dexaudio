# Quickstart: Queue and Now Playing Persistence (010-queue-playback-cache)

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Prerequisites

- Plex connected with a music library selected
- At least one album with playable tracks
- Node.js 22.x

## 1. Run the stack

```pwsh
cd backend
npm run dev
```

```pwsh
cd frontend
npm run dev
```

## 2. Automated tests

```pwsh
cd frontend
npm test -- playback-session
npm test -- playback-queue-store
```

Expected: snapshot serialize/restore, library mismatch clear, corrupt snapshot toast path, no auto-play on hydrate.

## 3. Manual checklist — queue persistence

- [ ] Play an album (3+ tracks). Reload the page.
- [ ] Queue shows the same tracks in the same order
- [ ] No audio plays automatically on reload
- [ ] Press play — audio starts from the restored track

## 4. Manual checklist — position restore

- [ ] Start a track, let it play ~30 seconds, reload
- [ ] Now Playing (or player chrome) shows the same track and ~30 s elapsed
- [ ] No audio until you press play
- [ ] Press play — resumes near the previous position (within ~2 s)

## 5. Manual checklist — queue only (never played)

- [ ] Add tracks to queue without pressing play (if supported) or build queue then stop before first play
- [ ] Reload — queue restored, no track treated as “now playing” until you select/play one

## 6. Manual checklist — session clear

- [ ] Reload with queue — confirm restore works
- [ ] Sign out / reconnect Plex (or switch library if UI supports it) — queue cleared
- [ ] Reload — empty queue, no stale tracks

## 7. Corrupt cache (dev)

- [ ] In DevTools → Application → Local Storage, corrupt `dexaudio.playback.session` JSON
- [ ] Reload — toast about failed restore, empty queue, app usable

## 8. Regression

- [ ] Normal play / pause / next / previous still work without reload
- [ ] No unexpected navigation to Now Playing on reload
