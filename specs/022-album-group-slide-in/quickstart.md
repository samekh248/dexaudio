# Quickstart: Album Group Slide-In (022-album-group-slide-in)

**Date**: 2026-06-01  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](../spec.md)

## Prerequisites

- Features 006 (library home groups) and 011 (album cover reveal) implemented
- Plex connected with a music library that populates home groups
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
npm test -- use-library-group-reveal
npm test -- LibraryGroupReveal
npm test -- AlbumGroupRow
```

Expected: group stays in preparing until all mocked entries ready; stagger delays applied; session key skips animation; reduced motion uses fade-only path.

## 3. Manual UI checklist — normal motion

Open albums home (`/`) with DevTools → Network → Slow 3G:

- [ ] Each group row shows pulse until its API data returns (no cards visible)
- [ ] After data returns, row still shows no visible cards until all covers in that row are ready
- [ ] Cards then slide in from the left with a slight left-to-right stagger
- [ ] Motion stays inside the horizontal carousel (clip at row edge)
- [ ] No second cover bounce after cards land
- [ ] Navigate to album detail and back — groups already shown do **not** slide again
- [ ] Full page reload — slide-in runs again

## 4. Manual UI checklist — reduced motion

Enable **Reduce motion** in OS settings:

- [ ] Groups still wait for all entries before showing
- [ ] Row fades in at once (no slide, no stagger)

## 5. Edge cases

- [ ] Random Picks: Browse All tile appears with album cards in one coordinated reveal
- [ ] Artist Spotlights: tile waits for all visible stack covers before row reveals
- [ ] Throttle one cover to fail — group still reveals after fallback timeout
- [ ] Retry a failed group — slide-in runs once on success

## 6. Out of scope sanity check

- [ ] Browse All (`/albums/all`) grid — no group slide-in
- [ ] Category View all pages — no group slide-in
