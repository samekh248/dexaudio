# Quickstart: Library Scroll Buttons (009-library-scroll-buttons)

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Prerequisites

- Feature 006 (Library View Refactor) implemented
- Plex connected with a library containing enough albums to overflow a home row (≥6 entries in a group)
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
npm test -- AlbumGroupRow
npm test -- use-horizontal-carousel
```

Expected: all tests pass; updated tests assert no visible scrollbar class, button visibility at edges, and scroll step behavior.

## 3. Manual UI checklist

Open `/` (library home) with a wide enough viewport that rows overflow:

- [ ] No horizontal scrollbar visible on any curated row
- [ ] Left/right chevron buttons appear in edge gutters when row overflows
- [ ] No buttons when all entries fit on screen
- [ ] Left button hidden at start; right button hidden at end
- [ ] Each right click reveals a new “page” of albums aligned from the left
- [ ] Each left click reverses by the same amount
- [ ] Edge album cards remain clickable (play, details) — gutters do not block cards
- [ ] Touch swipe / trackpad scroll still works
- [ ] Resize window — next button press moves by updated visible count
- [ ] Repeat for Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights

## 4. Narrow viewport (320 px)

- [ ] Buttons still visible when row overflows
- [ ] At least one entry scrolls per press when entries are partially clipped

## 5. Accessibility spot check

- [ ] Tab to carousel region and scroll buttons; Enter/Space activates scroll
- [ ] Screen reader announces “Scroll left” / “Scroll right” on buttons
- [ ] Focus ring visible on buttons and carousel region
