# Data Model: Library Scroll Buttons

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

**None.** No backend, database, or shared-type changes.

## Frontend State Model

### `CarouselScrollState` (hook return / UI state)

| Field | Type | Description |
|-------|------|-------------|
| `needsScrollControls` | `boolean` | `scrollWidth > clientWidth` — row overflows |
| `canScrollLeft` | `boolean` | Not at start (`scrollLeft > ε`) |
| `canScrollRight` | `boolean` | Not at end |
| `visibleEntryCount` | `number` | Fully visible direct children; min 1 when scrolling |
| `scrollRef` | `RefObject<HTMLDivElement>` | Attached to horizontal scroll container |

### `CarouselEntry` (DOM child)

Not a typed entity — any direct child of the scroll container (album card, artist tile, Browse All tile). Identified by index among `scrollRef.current.children`.

**Full visibility rule**: `entryRect.left >= containerRect.left - 1` AND `entryRect.right <= containerRect.right + 1`.

### State transitions

```text
[Row mounted]
  → measure overflow
  → needsScrollControls = false → no gutters rendered (FR-008)
  → needsScrollControls = true → show gutters; canScrollLeft=false, canScrollRight=true

[User: scroll forward]
  → targetIndex = firstVisibleIndex + visibleEntryCount (clamped)
  → snap scrollIntoView inline start
  → recompute canScrollLeft/Right

[User: scroll backward]
  → targetIndex = max(0, firstVisibleIndex - visibleEntryCount)
  → snap scrollIntoView inline start
  → recompute

[At end — partial page]
  → forward scroll aligns last entry to trailing edge
  → canScrollRight = false → hide right gutter button (FR-007)

[Resize / orientation]
  → ResizeObserver fires → remeasure visibleEntryCount + overflow flags
  → scroll position preserved (browser default); next button uses new count (FR-005)
```

## Component Boundaries

| Component | Responsibility |
|-----------|----------------|
| `useHorizontalCarousel` | DOM measurement, step index, scroll actions, visibility flags |
| `AlbumGroupRow` | Layout (gutters + scroll area), wire hook, render shadcn buttons |
| `AlbumsHomePage` | Unchanged — passes `entries` as today |

## Constants

| Constant | Value | Usage |
|----------|-------|--------|
| `SCROLL_EPSILON` | 2 px | Float tolerance for at-start/at-end detection |
| `GUTTER_WIDTH` | `2.5rem` (40 px) | Fixed gutter column width (`w-10`) |
| `MIN_SCROLL_STEP` | 1 | When zero entries fully visible (FR-012) |

## Validation Rules

- Scroll buttons MUST NOT render when `needsScrollControls` is false.
- Left button MUST NOT render when `canScrollLeft` is false.
- Right button MUST NOT render when `canScrollRight` is false.
- `visibleEntryCount` MUST be ≥ 1 before any programmatic scroll.
- Gutter columns MUST NOT contain row entries — only the scroll control.
