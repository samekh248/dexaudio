# Research: Library Scroll Buttons

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## 1. Row layout with edge gutters (no card overlap)

**Decision**: Three-column flex layout — fixed-width left gutter | flex-1 scroll container | fixed-width right gutter. Buttons live only in gutters; scroll container holds entry cards with existing `gap-4` and `shrink-0` card widths.

**Rationale**: Matches clarification Q5 (dedicated gutters, cards fully clickable). Simpler than absolute overlay positioning and avoids z-index/pointer-events complexity.

**Alternatives considered**:
- *Overlay buttons on cards*: Rejected — blocks edge card clicks per spec FR-014.
- *Buttons below row*: Rejected — user chose edge placement in clarify session.

## 2. Visible entry count algorithm

**Decision**: Query direct children of the scroll container; count those whose `getBoundingClientRect()` is fully inside the container rect (left ≥ container.left, right ≤ container.right, within 1 px tolerance). Use that count as scroll step; minimum step of 1 when count is 0.

**Rationale**: Works for mixed entry types (album cards, artist tiles, Browse All tile) without coupling to fixed 160 px width. Handles resize automatically on recalc.

**Alternatives considered**:
- *Fixed math from card width + gap*: Rejected — brittle if card sizes change or mixed tile heights differ.
- *IntersectionObserver threshold 1.0*: Rejected — heavier setup for ≤11 children; rect math is sufficient.

## 3. Snap alignment after button press

**Decision**: Compute target child index (current first fully-visible index ± step), clamp to valid range; for forward at end, target index that aligns last child to trailing edge (`scrollLeft = scrollWidth - clientWidth`). Call `target.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' })`.

**Rationale**: Native snap to entry boundary satisfies FR-003/FR-004 left-edge alignment without custom scrollLeft pixel math for variable gaps.

**Alternatives considered**:
- *Pixel-based scrollLeft += N × (width + gap)*: Rejected — drifts with subpixel rounding.
- *CSS scroll-snap only*: Rejected — insufficient control for “page by visible count” semantics.

## 4. Hiding native scrollbar

**Decision**: Apply utility class on scroll container:

```css
scrollbar-width: none;        /* Firefox */
-ms-overflow-style: none;     /* legacy Edge */
&::-webkit-scrollbar { display: none; }  /* Chrome/Safari */
```

Keep `overflow-x-auto` so touch/trackpad swipe still works (FR-010).

**Rationale**: Spec FR-002 requires hidden scrollbar with scrollable content; no dependency needed.

**Alternatives considered**:
- *npm `tailwind-scrollbar-hide` plugin*: Rejected — Constitution V (no new deps).
- *shadcn ScrollArea*: Rejected — replaces native scroll, adds complexity, may fight custom step logic.

## 5. Button visibility state

**Decision**: `canScrollLeft = scrollLeft > epsilon`; `canScrollRight = scrollLeft + clientWidth < scrollWidth - epsilon`. Recompute on `scroll`, `resize` (ResizeObserver on container), and after entries change. Hide buttons when false; hide both gutters when `scrollWidth <= clientWidth`.

**Rationale**: Matches clarify Q1 (hide unavailable controls) and FR-006/FR-007/FR-008.

**Alternatives considered**:
- *Disabled visible buttons*: Rejected in clarify session.

## 6. UI control components

**Decision**: shadcn/ui `Button` `variant="ghost"` `size="icon"` with `ChevronLeft` / `ChevronRight` from existing `lucide-react`.

**Rationale**: Constitution II; matches `AudioPlayer` and `QueuePanel` icon button patterns.

**Alternatives considered**:
- *Custom `<button>`*: Rejected — shadcn equivalent exists.

## 7. Scroll animation

**Decision**: `behavior: 'smooth'` on programmatic scroll; keep existing `scroll-smooth` class on container for swipe consistency.

**Rationale**: Spec allows smooth or instant; smooth aids orientation (SC-002 user-visible movement).

**Alternatives considered**:
- *Instant only*: Acceptable but worse UX; not chosen.
