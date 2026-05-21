# Feature Specification: Library Scroll Buttons

**Feature Branch**: `009-library-scroll-buttons`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "I want to replace the horizontal scrollbar in the library view with buttons on each end that will scroll the list for me. The buttons will scroll x number of albums, where x is the number of visible albums."

## Clarifications

### Session 2026-05-20

- Q: When a scroll button cannot act (left at start, right at end), should it be hidden or disabled but still visible? → A: Hide unavailable controls entirely.
- Q: Where should the scroll buttons sit relative to the album row? → A: At the left/right edges of the scroll area in dedicated gutters that do not cover cards (refined from initial overlay intent).
- Q: After a scroll button press, how should the row land? → A: Snap so the leftmost entry after the scroll aligns to the start (left edge) of the row viewport.
- Q: When a row overflows, when should the overlay scroll buttons be visible? → A: Always visible whenever the row overflows.
- Q: How should overlay buttons interact with clicking edge cards? → A: Reserve a dedicated edge gutter outside card content so edge cards stay fully clickable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scroll a library row with end buttons (Priority: P1)

As a user browsing curated album groups on the library home, I want left and right buttons at the ends of each horizontal row instead of a scrollbar, so that I can move through albums in clear page-sized steps without hunting for or dragging a thin scrollbar.

**Why this priority**: This is the core interaction change. Replacing the scrollbar with explicit controls directly addresses the user's request and makes horizontal browsing more discoverable on desktop and touch-first devices where scrollbars are easy to miss.

**Independent Test**: Open any library group row with more albums than fit on screen. Activate the right button and confirm the row advances by exactly one viewport of visible albums. Activate the left button and confirm it reverses by the same amount.

**Acceptance Scenarios**:

1. **Given** a library group row has more entries than fit in the visible area, **When** the row is displayed, **Then** scroll controls are always visible in dedicated left and right edge gutters that do not cover album cards, and no horizontal scrollbar is shown.
2. **Given** the row is at its starting position, **When** the user activates the right-end button, **Then** the row scrolls forward by the number of albums currently fully visible in the viewport and snaps so the leftmost entry in the new view aligns to the left edge of the row viewport.
3. **Given** the row has been scrolled forward, **When** the user activates the left-end button, **Then** the row scrolls backward by the number of albums currently fully visible in the viewport and snaps so the leftmost entry in the new view aligns to the left edge of the row viewport.
4. **Given** the row is at its starting position, **When** the row is displayed, **Then** the left-end button is not shown because there is nothing to scroll toward on the left.
5. **Given** the row is scrolled to its end, **When** the row is displayed, **Then** the right-end button is not shown because there is nothing to scroll toward on the right.
6. **Given** the user resizes the window or rotates the device, **When** the number of visible albums changes, **Then** subsequent button presses scroll by the updated visible count.

---

### User Story 2 - Browse all library group rows consistently (Priority: P1)

As a user on the library home, I want every horizontal album or artist row to use the same scroll-button pattern, so that browsing feels consistent across Recently Played, Recently Added, Hidden Gems, Random Picks, and Artist Spotlights.

**Why this priority**: The library home is composed of multiple carousel rows. Inconsistent scroll behavior between rows would feel broken and undermine the layout refactor already in place.

**Independent Test**: Load the library home with at least two groups that overflow horizontally. Confirm each row shows the same button placement, scroll step size logic, and absence of a horizontal scrollbar.

**Acceptance Scenarios**:

1. **Given** multiple curated groups are visible on the library home, **When** any group row overflows horizontally, **Then** that row uses end buttons instead of a horizontal scrollbar.
2. **Given** a group row fits entirely within the viewport, **When** the row is displayed, **Then** scroll buttons are not shown because scrolling is not needed.
3. **Given** a row contains mixed entry types (album cards, artist spotlight tiles, or the Browse All tile), **When** the user scrolls with the buttons, **Then** the scroll step is based on how many entries are fully visible, regardless of entry type.

---

### User Story 3 - Navigate rows without losing existing access paths (Priority: P2)

As a user who prefers keyboard, touch, or assistive technology, I want the row to remain reachable and operable beyond the new buttons, so that the scroll change does not regress how I already browse carousels.

**Why this priority**: Removing the visible scrollbar must not trap users who rely on swipe, keyboard focus, or screen readers. Buttons are the primary affordance, but other paths should remain viable where they already exist.

**Independent Test**: Focus the carousel region with the keyboard and move through entries. On a touch device, swipe the row horizontally. Confirm content remains reachable and button state updates to reflect scroll position.

**Acceptance Scenarios**:

1. **Given** a user focuses the carousel region, **When** they use established keyboard navigation for the row, **Then** they can still reach off-screen entries and button availability updates to match scroll position.
2. **Given** a user swipes or uses a trackpad on a touch-capable device, **When** they scroll the row horizontally, **Then** off-screen entries remain reachable even though the horizontal scrollbar is not shown.
3. **Given** a screen reader user encounters a carousel row, **When** they navigate the row, **Then** the row is announced as a browsable region and the scroll buttons have clear labels indicating direction (e.g., scroll left, scroll right).
4. **Given** scroll buttons are shown in edge gutters, **When** the user activates a visible edge card, **Then** the card receives the interaction (e.g., play or open details) and the scroll control does not intercept the click.

---

### Edge Cases

- What happens when only part of the next album would be revealed by a full-page scroll? The row advances by the count of fully visible albums and snaps the new leading entry to the left edge; any remaining partial entry at the trailing edge is acceptable until the next press or swipe/keyboard navigation.
- What happens when the viewport is so narrow that zero albums are fully visible? The system scrolls forward or backward by at least one entry so the user is never stuck with non-functional buttons.
- What happens when album count changes while the row is open (e.g., a group finishes loading more entries)? Button availability and scroll position remain stable; the user can continue scrolling through newly available entries.
- What happens when the user clicks near the row edge where a scroll button sits? The button occupies a dedicated edge gutter only; clicks on visible cards register on the card, not the scroll control.
- What happens when the user rapidly clicks a scroll button? Each activation applies one scroll step; the row does not skip multiple pages unintentionally from a single press-and-hold unless that behavior already exists elsewhere in the product.
- What happens at the last page when fewer than a full viewport of albums remains? The final scroll snaps with the last entry aligned at the end of the row and the right button is hidden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace the visible horizontal scrollbar on library home carousel rows with scroll controls in dedicated left and right edge gutters that do not cover row entries.
- **FR-002**: The system MUST hide the native horizontal scrollbar for those rows while keeping their content horizontally scrollable.
- **FR-003**: When the user activates the right-end control, the system MUST scroll the row forward by the number of entries that are fully visible in the row viewport at the time of activation, then snap so the leftmost entry in the new view aligns to the left edge of the row viewport.
- **FR-004**: When the user activates the left-end control, the system MUST scroll the row backward by the number of entries that are fully visible in the row viewport at the time of activation, then snap so the leftmost entry in the new view aligns to the left edge of the row viewport.
- **FR-005**: The system MUST recalculate the visible-entry count when the row viewport size changes (window resize, orientation change, or layout reflow).
- **FR-006**: The system MUST hide the left-end control when the row is scrolled to its starting position.
- **FR-007**: The system MUST hide the right-end control when the row is scrolled to its ending position.
- **FR-008**: The system MUST NOT show scroll controls on rows where all entries already fit within the visible area.
- **FR-009**: The scroll-button behavior MUST apply uniformly to all horizontal library home group rows, including rows with artist spotlight tiles and the Browse All tile in Random Picks.
- **FR-010**: The system MUST preserve non-scrollbar navigation paths for the row (keyboard focus within the carousel and touch or trackpad horizontal scrolling) so off-screen entries remain reachable.
- **FR-011**: Scroll controls MUST include accessible names that identify scroll direction for assistive technology users.
- **FR-012**: When fewer than one entry is fully visible in the viewport, the system MUST scroll by at least one entry per button activation so navigation always progresses.

- **FR-013**: When a row overflows horizontally, scroll controls MUST remain visible at all times (not gated on hover or focus).
- **FR-014**: Scroll controls MUST be placed in reserved edge gutters so underlying row entries (including edge cards) remain fully clickable and interactive.

### Key Entities

- **Library group row**: A horizontal collection of album cards, artist spotlight tiles, or special tiles (e.g., Browse All) under a curated category on the library home.
- **Visible entry count**: The number of row entries fully contained within the row viewport at a given moment; this value determines scroll step size.
- **Scroll control state**: Whether the left or right control is shown or hidden based on current scroll position and whether scrolling is needed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In user testing or structured review, 100% of overflowing library home rows display end scroll controls and no visible horizontal scrollbar.
- **SC-002**: For rows tested at three viewport widths (narrow, typical desktop, wide), each button activation moves the row by exactly the fully visible entry count ± one entry when the viewport cannot fit a whole entry.
- **SC-003**: Users can reach the first and last entry in any overflowing row within three button presses on a typical desktop width when the row contains 10 entries.
- **SC-004**: After window resize, the next button press uses the updated visible entry count in 100% of tested cases.
- **SC-005**: Keyboard and touch users report no loss of ability to reach off-screen entries compared with the pre-change carousel behavior.

## Assumptions

- The change applies to horizontal carousel rows on the library home only; dense-grid category "View all" pages and Browse All Albums A–Z layout are out of scope because they do not use horizontal carousels.
- "Fully visible" means an entry's entire card/tile is within the row viewport; partially clipped entries are not counted toward the scroll step.
- Touch swipe and trackpad horizontal scrolling remain supported as secondary navigation; only the visible scrollbar is removed.
- Button styling will follow existing application visual patterns for icon buttons; specific icon choice is an implementation detail left to planning.
- Scroll controls sit in reserved left and right edge gutters within the row; gutters do not cover album cards or other row entries, so edge entries remain fully clickable.
- Scroll animation may be smooth or instant as long as the user clearly sees which entries moved and the row settles on a snap-aligned position; no specific animation duration is mandated.
- Rows that do not overflow require no scroll controls, matching current behavior where scrolling is unnecessary.
