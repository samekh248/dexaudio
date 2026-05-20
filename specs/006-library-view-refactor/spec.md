# Feature Specification: Library View Refactor

**Feature Branch**: `007-library-view-refactor`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description (from Linear project [Library View refactor](https://linear.app/audiodex/project/library-view-refactor-d90e355db7fd/overview)): Each group needs to load async. The cards need to be the same dimensions — all the size of the artist spotlight cards. Set the list size for each group to 10. Anything that doesn't fit in the window should be viewed as a carousel, but not one that loops. A "View all" for each category should be linked at the bottom of each category row. The "View all" link for Recently Added should take the user to a view that shows the top 20 recently added albums.

## Clarifications

### Session 2026-05-20

- Q: Should Random Picks have a separate "View all" link? → A: No — the Browse All Albums tile is sufficient; Random Picks does not get a "View all" link.
- Q: Does the Browse All Albums tile count toward the 10-item row cap in Random Picks? → A: No — up to 10 random album cards plus the Browse All tile (11 entries max in that row).
- Q: How should category "View all" pages lay out their items? → A: Reuse the Browse All Albums A–Z page layout (dense grid, existing browse styling); artist spotlights use the same grid pattern with artist tiles.
- Q: What vertical order applies while groups load at different speeds? → A: Fixed group order — each group keeps its slot with a row-level loading state until ready (no reordering as faster groups complete).
- Q: What recovery is offered when a single group fails to load? → A: Automatic retry once, then a per-row Retry control that reloads only that failed group.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the library home load progressively by group (Priority: P1)

As a user opening the albums library home, I want each curated group (Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights) to appear as soon as its own data is ready, so that I can start browsing and playing music without waiting for every group to finish loading.

**Why this priority**: The library home is the primary entry point. Blocking the entire page on the slowest group makes large libraries feel broken; progressive loading keeps the view usable immediately.

**Independent Test**: With a library where groups resolve at different speeds, the user sees group headers and cards appear independently. Fast groups render first; slower groups show a brief loading state for that row only, without blanking groups that already loaded.

**Acceptance Scenarios**:

1. **Given** the user opens the library home, **When** groups load at different speeds, **Then** group sections appear in fixed order (Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights) — slower groups show a row-level loading state in their slot until ready, without reordering faster groups above slower ones.
2. **Given** one group is still loading in its fixed slot, **When** another group has already loaded, **Then** the loaded group remains visible and interactive (play, details, horizontal scroll) and is not replaced by a full-page spinner.
3. **Given** a group fails to load, **When** the failure is isolated to that group, **Then** the application automatically retries that group once; if it still fails, the row shows a clear error with a Retry control that reloads only that group while other groups remain visible and interactive.
4. **Given** the user leaves and returns to the library home, **When** the view loads again, **Then** groups refresh according to existing freshness rules for that category (e.g., random picks change on re-entry).

---

### User Story 2 - Browse groups in a consistent, scrollable carousel (Priority: P1)

As a user browsing curated groups on the library home, I want every card in every group to be the same size and shape, with up to 10 items per group shown in a horizontal row I can scroll when they do not all fit on screen, so that the layout feels uniform and I can scan categories quickly.

**Why this priority**: Visual inconsistency between album cards and artist spotlight tiles makes the home view feel unfinished. A fixed card size and non-looping carousel are the core UX changes in this refactor.

**Independent Test**: On a typical desktop width, a group with 10 entries shows uniform cards; overflow is reachable by horizontal scroll or equivalent swipe. The carousel does not wrap from the last item back to the first.

**Acceptance Scenarios**:

1. **Given** any group on the library home, **When** it renders album or artist spotlight entries, **Then** every card in that row uses the same width and height (matching the artist spotlight tile footprint).
2. **Given** a group has 10 qualifying entries, **When** the row is displayed, **Then** up to 10 entries are available in that group's carousel (not capped at 5), except Random Picks which may show up to 10 random albums plus the Browse All Albums tile (11 entries total).
3. **Given** more cards are in the row than fit in the viewport, **When** the user scrolls horizontally, **Then** they can reach off-screen cards and the carousel stops at the first and last item (no infinite loop).
4. **Given** a group has fewer than 10 qualifying entries, **When** the row is displayed, **Then** only actual entries are shown (no placeholders) and the carousel still does not loop.
5. **Given** a touch or keyboard user, **When** they navigate the carousel, **Then** focus order and scroll position remain predictable and do not jump back to the start after reaching the end.

---

### User Story 3 - Open a full list for any category from "View all" (Priority: P1)

As a user who wants more than the 10 items shown on the home row, I want a "View all" link at the bottom of each category that opens a dedicated list for that category, so that I can explore the full shortlist without hunting through unrelated library pages.

**Why this priority**: Expanding from 5 to 10 items on the home row still truncates long-tail content. Category-specific "View all" pages are the escape hatch that makes the larger home rows useful.

**Independent Test**: Each non-empty group on the library home shows a "View all" control beneath the carousel. Activating it opens the correct category list with the expected sort order and item cap.

**Acceptance Scenarios**:

1. **Given** the Recently Added group is visible on the library home, **When** the user activates "View all" for that group, **Then** they land on a page showing the top 20 albums ordered by added date (newest first), laid out in the same dense grid style as Browse All Albums (not a horizontal carousel).
2. **Given** the Recently Played group is visible, **When** the user activates "View all", **Then** they land on a dense-grid page showing the top 20 albums by play count in the trailing 30 days (most played first), using the same eligibility rules as the home row.
3. **Given** the Hidden Gems group is visible, **When** the user activates "View all", **Then** they land on a dense-grid page showing the top 20 hidden-gem albums using the same rating and neglect rules as the home row.
4. **Given** the Artist Spotlights group is visible, **When** the user activates "View all", **Then** they land on a dense-grid page listing up to 20 eligible spotlight artists (more than two albums in the library), ordered by the same round-robin rules as the home row, using artist spotlight tiles in the same grid pattern as Browse All Albums.
5. **Given** a group is hidden because it has zero qualifying entries, **When** the library home loads, **Then** that group and its "View all" link are not shown.
6. **Given** the Random Picks group is visible, **When** the user views it, **Then** there is no "View all" link beneath the row — full-library access is provided only via the Browse All Albums tile in the carousel.
7. **Given** the user opens a category list and uses back navigation, **When** they return to the library home, **Then** scroll position and already-loaded groups are preserved where the application already supports that behavior for library browsing.

---

### User Story 4 - Keep existing play and navigation behavior on the refactored cards (Priority: P2)

As a user interacting with refactored cards, I want hover-to-play, album details navigation, artist spotlight play-all, and the Browse All Albums entry point to work the same as before, so that this layout change does not regress listening workflows.

**Why this priority**: This feature reshapes layout and loading, not playback semantics. Regressions here would block adoption even if the new carousel looks better.

**Independent Test**: On resized uniform cards, play overlay, detail links, artist spotlight actions, and Browse All Albums behave per the established albums library view rules.

**Acceptance Scenarios**:

1. **Given** an album card in any group, **When** the user activates the play affordance, **Then** playback starts from track 1, the queue is replaced with that album's tracks, and the user is taken to Now Playing (including restart-when-same-album behavior).
2. **Given** an album card, **When** the user activates a non-play area, **Then** they navigate to album details without starting playback.
3. **Given** an artist spotlight card, **When** the user activates play vs. details, **Then** discography queue vs. artist albums page behavior is unchanged from the prior library view.
4. **Given** the Random Picks group, **When** it is shown, **Then** the row contains up to 10 random album cards plus the Browse All Albums tile (tile does not consume a random slot), all using uniform card dimensions.

---

### Edge Cases

- **Single group still loading while others are ready**: Only that row's fixed slot shows loading; the rest of the page is usable; completed groups do not move up or down.
- **Group load failure**: Application auto-retries the failed group once; if still failing, row shows error plus manual Retry (reloads that group only); other groups unaffected.
- **Auto-retry succeeds on second attempt**: Row transitions from loading to content without user action; no error state shown.
- **Group with 1–9 entries**: Carousel shows only those items; "View all" still appears when the group is visible and rules allow a deeper list.
- **Group with exactly 10 entries on home but more qualify for "View all"**: Home shows 10; category list shows up to 20 (or all eligible artists for spotlights, capped at 20).
- **Random Picks with large library**: Row shows up to 10 random albums plus Browse All tile (11 carousel entries); small libraries show fewer random cards but the tile remains when the group is visible.
- **Viewport fits all 10 cards**: Horizontal scroll is unnecessary but must not enable looping; scroll affordance may be hidden when not needed.
- **Very narrow mobile viewport**: User can swipe the carousel; card size stays consistent (may show fewer cards at once).
- **Missing cover art**: Placeholder preserves card dimensions so the row does not jump.
- **Empty library**: Existing empty-state behavior applies; no groups and no "View all" links.
- **Recently Added "View all" with fewer than 20 albums**: List shows all qualifying albums sorted newest first.
- **User refreshes only one group**: Per-group refresh updates that row without tearing down the entire page (if the application exposes refresh).

## Requirements *(mandatory)*

### Functional Requirements

#### Progressive loading

- **FR-001**: The library home MUST load each curated group independently so that a group can render as soon as its data is available without waiting for other groups.
- **FR-002**: While a group is loading, the application MUST show a loading indicator scoped to that group only (not a full-page blocker once any group has rendered).
- **FR-003**: If one group fails to load, the application MUST automatically retry that group **once** without user action. If the retry also fails, the application MUST surface a row-level error for that group only with a **Retry** control that reloads **only** that group, and MUST keep other successfully loaded groups visible and interactive.
- **FR-004**: Group selection rules, ordering, hiding of empty groups, and freshness behavior MUST remain consistent with the existing albums library view feature unless explicitly changed below.
- **FR-004a**: While groups load asynchronously, the library home MUST preserve the fixed vertical order of group sections (Recently Played → Recently Added → Hidden Gems → Random Picks → Artist Spotlights). Groups that are not yet ready MUST occupy their slot with a row-level loading indicator; groups MUST NOT reorder based on which finishes loading first. Empty groups remain hidden (no slot) once resolved.

#### Uniform layout and carousel

- **FR-005**: Every entry card in every group on the library home (album cards, artist spotlight tiles, and Browse All Albums tile) MUST use the same outer dimensions, matching the artist spotlight tile footprint.
- **FR-006**: Each curated group on the library home MUST display up to **10** entries in its horizontal row (previously five), subject to the same eligibility rules per group type, **except Random Picks** which MUST show up to **10** random album cards **plus** the Browse All Albums tile (11 entries total; the tile does not count toward the 10 random slots).
- **FR-007**: When more entries exist in a row than fit in the viewport, the row MUST be presented as a horizontal carousel the user can scroll; the carousel MUST NOT loop (no wrap from last item to first).
- **FR-008**: Carousel scrolling MUST preserve stable card order and MUST allow the user to reach the first and last visible entry without auto-advancing or infinite rotation.

#### Category "View all" pages

- **FR-009**: Each visible group on the library home MUST include a "View all" link positioned below that group's carousel, **except Random Picks** — that group uses the Browse All Albums tile as its only full-library affordance and MUST NOT show a separate "View all" link.
- **FR-010**: Activating "View all" for **Recently Added** MUST open a dedicated list showing the **top 20** most recently added albums in the library, ordered by added date descending.
- **FR-011**: Activating "View all" for **Recently Played** MUST open a dedicated list showing the **top 20** albums by play count in the trailing 30 days, ordered by play count descending (ties by most recent play), using the same eligibility as the home row.
- **FR-012**: Activating "View all" for **Hidden Gems** MUST open a dedicated list showing the **top 20** qualifying hidden-gem albums (rating floor and neglect threshold unchanged from the existing library view), ordered by rating then neglect as on the home row.
- **FR-013**: Activating "View all" for **Artist Spotlights** MUST open a dedicated list showing up to **20** eligible spotlight artists using the same selection and ordering rules as the home row.
- **FR-014**: Category list pages MUST use the **Browse All Albums (A–Z) page layout** — dense scrollable grid with the same styling as the full-library browse view — not a horizontal carousel. Album-based category lists show album cards; Artist Spotlights "View all" uses the same grid pattern with artist spotlight tiles. Card dimensions and play/details affordances match the library home.
- **FR-015**: Groups with zero qualifying entries MUST NOT display a "View all" link (because the group itself is hidden).

#### Preserved interactions

- **FR-016**: Album play, album details navigation, artist spotlight play-all and details navigation, and Browse All Albums (full A–Z library) MUST continue to behave as defined in the existing albums library view specification.
- **FR-017**: The Random Picks group MUST include the Browse All Albums tile in addition to up to 10 random album cards (tile is always present when the group is visible and is extra—not a substitute for a random slot), with the tile conforming to uniform card dimensions.

#### Accessibility and performance

- **FR-018**: Carousel rows MUST be operable by keyboard and touch (horizontal scroll or equivalent), with group headings and "View all" links reachable in a logical focus order.
- **FR-019**: First meaningful paint of the library home MUST still occur within 2 seconds for a representative library (~1,000 albums) by showing at least one group without waiting for all groups.
- **FR-020**: Lazy-loading of cover art and row-level loading MUST keep scrolling responsive when carousels contain 10 items.

### Key Entities

- **Library Group Row**: A named horizontal section on the library home at a fixed vertical position, with up to 10 preview entries (Random Picks: up to 10 random albums plus Browse All tile), independent load/error state, non-looping carousel behavior, and an optional "View all" link.
- **Category List View**: A full-page list reached from "View all" for one group type; shows up to 20 items in the Browse All Albums dense-grid layout (album cards or artist spotlight tiles per category), with the same sort rules as the home preview.
- **Album Card / Artist Spotlight Tile**: Visual entry in a row; after refactor, shares one canonical size across types.
- **Album Group** (existing): Named collection with selection rules (recently played, recently added, etc.); preview size increases from 5 to 10; deep list cap is 20 where specified.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a representative ~1,000-album library, the first group appears within 2 seconds of opening the library home in 95% of test runs, without waiting for all groups.
- **SC-002**: 100% of cards in a single library home screenshot share the same outer width and height across album, artist spotlight, and Browse All entries.
- **SC-003**: Each home group shows up to 10 preview items when enough qualifying content exists (Random Picks: 10 random albums plus Browse All tile); verified on fixture libraries with ≥10 items per category.
- **SC-004**: In usability checks, users can scroll a 10-item carousel to the last card and confirm it does not loop back to the first without an explicit backward scroll.
- **SC-005**: "View all" for Recently Added opens a list of exactly the 20 newest-added albums (or all albums if fewer than 20 exist), in correct order — verified against a dated fixture set.
- **SC-006**: "View all" links for Recently Played, Hidden Gems, and Artist Spotlights open dense-grid pages (Browse All Albums layout) capped at 20 items with ordering consistent with home-row rules — verified per category on shared fixtures.
- **SC-007**: No regression in play-vs-details success rate: at least 80% of test users still distinguish play overlay from details on first try after the layout change.
- **SC-008**: Row-level failure injection leaves at least one other group fully usable without a full-page error screen; after auto-retry fails, manual per-row Retry successfully reloads the failed group in test scenarios.

## Assumptions

- This feature refactors the existing grouped albums library home delivered in feature 003; it does not replace Browse All Albums (A–Z) or redesign Now Playing.
- "Artist spotlight card size" is the canonical target dimensions for all library home cards (album, spotlight, browse-all tile).
- "View all" for each category follows the Recently Added pattern: dedicated list, same sort/filter rules as the home row, cap of **20** items for album-based categories unless fewer qualify.
- Artist Spotlights "View all" lists artists (not individual albums), capped at 20, using the same eligibility (more than two albums) and round-robin ordering as the home row.
- Random Picks does not include a "View all" link (clarified 2026-05-20); Browse All Albums in the carousel is the sole full-library affordance for that group.
- Random Picks row cap: up to 10 random albums plus Browse All tile (11 carousel entries); the tile does not count toward the 10 random slots (clarified 2026-05-20).
- Async per-group loading applies to data fetch and rendering; it does not change underlying eligibility formulas (30-day plays, 3-star hidden gems, 3-month neglect, etc.) unless a future spec says otherwise.
- Groups load in fixed vertical order with per-slot loading states; faster groups do not jump above slower ones (clarified 2026-05-20).
- Failed groups auto-retry once, then expose per-row manual Retry (clarified 2026-05-20).
- Category "View all" pages reuse Browse All Albums dense-grid layout (clarified 2026-05-20); routes and URLs are left to planning.
- Hidden groups (zero entries) remain hidden entirely, including their "View all" links.
