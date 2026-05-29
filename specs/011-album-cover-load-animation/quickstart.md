# Quickstart: Album Cover Load Animation (011-album-cover-load-animation)

**Date**: 2026-05-29  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Prerequisites

- Features 003/006 (albums library views) implemented
- Plex connected with a library containing albums with cover art
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
npm test -- use-album-cover-load
npm test -- AlbumCoverImage
npm test -- AlbumCard
```

Expected: state machine transitions, no partial image visibility, overlay gated until reveal, reduced-motion class selection.

## 3. Manual UI checklist — normal motion

Open `/` with network throttled (DevTools → Slow 3G):

- [ ] Album cards show empty cover slots while loading (no partial images)
- [ ] Each cover fades in with a subtle bounce when loaded
- [ ] Title and artist appear with the cover (not before)
- [ ] Play button does not appear on hover until cover reveal finishes
- [ ] Scrolling lazy-loads new cards with the same behavior
- [ ] Artist spotlight stack layers reveal independently
- [ ] Browse All (`/albums/all`) grid behaves the same
- [ ] Category page (e.g. `/library/recently-added`) behaves the same

## 4. Missing / failed art

- [ ] Album without art shows immediate fallback + title (no animation)
- [ ] Block a cover URL → fallback within ~10s, title/play available

## 5. Reduced motion

Enable **Reduce motion** in OS settings, reload `/`:

- [ ] Covers fade in without upward bounce
- [ ] No partial images during load

## 6. Re-render stability

- [ ] Navigate away and back — no replay flicker on already-seen covers (same session)
- [ ] React Query refetch does not re-animate visible covers

## 7. Layout

- [ ] No layout shift when covers appear (stable card dimensions)
