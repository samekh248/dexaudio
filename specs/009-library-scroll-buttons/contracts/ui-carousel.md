# UI Contract: Library Home Carousel (`AlbumGroupRow`)

**Date**: 2026-05-20  
**Feature**: 009-library-scroll-buttons  
**Spec**: [../spec.md](../spec.md)

This document defines the user-facing carousel behavior for library home rows. **No REST API changes.**

## Component

`frontend/src/components/albums/AlbumGroupRow.tsx`

### Props (unchanged)

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | `string` | yes | Used for heading + `aria-label` |
| `entries` | `ReactNode[]` | yes | Direct children of scroll container |
| `hideHeading` | `boolean` | no | Default `false` |

### Layout contract

```text
┌─────────────────────────────────────────────────────────┐
│ [optional h2 title]                                     │
├──────┬──────────────────────────────────────────┬───────┤
│ gutter│  scroll container (overflow-x, no bar)  │ gutter│
│  ◀   │  [entry][entry][entry]…                  │   ▶   │
└──────┴──────────────────────────────────────────┴───────┘
```

- Gutter width: fixed (~40 px); contains at most one icon button.
- Scroll container: `role="region"`, `aria-label="{title} carousel"`, focusable.
- Gutter buttons: shadcn `Button`, `aria-label="Scroll left"` / `"Scroll right"`.

### Scroll behavior

| Action | Behavior |
|--------|----------|
| Right button | Advance by `visibleEntryCount` entries; snap leading entry to left edge |
| Left button | Retreat by `visibleEntryCount` entries; snap leading entry to left edge |
| Final page forward | Snap last entry to trailing edge; hide right button |
| Touch / trackpad swipe | Native horizontal scroll; no visible scrollbar |
| Window resize | Recalculate `visibleEntryCount` on next interaction |

### Visibility rules

| Condition | Left button | Right button |
|-----------|-------------|--------------|
| All entries fit | hidden | hidden |
| At start | hidden | visible |
| Middle | visible | visible |
| At end | visible | hidden |

Buttons are **removed from DOM** when hidden (not merely disabled).

### Consumers

Used on `AlbumsHomePage` for:

- Recently Played
- Recently Added
- Hidden Gems
- Random Picks (includes Browse All tile)
- Artist Spotlights

**Out of scope**: Category list pages, Browse All A–Z grid.

### Accessibility

- WCAG 2.1 AA: keyboard-activatable buttons, visible focus ring, descriptive `aria-label`.
- Carousel region remains tabbable; card links/buttons inside remain reachable.
