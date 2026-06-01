# Feature Specification: Album Group Slide-In Animation

**Feature Branch**: `022-album-group-slide-in`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "When loading each of the album groups on the library page, the album cards should have a nice animation where they slide in from the left (remaining inside the actual group boundaries and only once all the info for all the cards in the group are loaded."

## Clarifications

### Session 2026-06-01

- Q: When the group slide-in runs, how should it relate to per-card cover fade/bounce on home group rows? → A: Covers complete (or show fallback) while the row is hidden; group slide-in shows cards already in their final visual state.
- Q: Should cards in a group slide in together or with staggered timing? → A: Short left-to-right stagger—each card starts slightly after the previous, using the same group readiness gate.
- Q: When should slide-in run again after the user leaves and returns to the library home? → A: Skip slide-in for groups already revealed this session; animate again only on full page reload or active library change.
- Q: With reduced motion enabled, should staggered slide-in become simultaneous fade or per-card staggered fade? → A: All entries appear at once with a brief shared fade (no slide, no stagger).
- Q: What counts as “ready” for Artist Spotlight tiles in the group gate? → A: Each spotlight tile is one stagger step; every visible stacked cover layer in that tile must be ready (while the row is hidden) before the group gate opens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coordinated reveal when a library group finishes loading (Priority: P1)

As a user opening the albums library home, I want each curated group row to reveal its cards together with a smooth slide-in from the left only after every card in that row is ready to display, so that the home view feels polished and I never see a half-populated carousel with cards still loading one-by-one.

**Why this priority**: The library home loads groups independently; staggered or partial card appearance within a row feels broken. A group-level gate plus entrance motion is the core request.

**Independent Test**: Open the albums library home with a throttled network. When a group’s data returns, the row stays in its loading state until every entry in that group (album cards and any special tiles in that row) is ready. Then all visible entries slide in from the left within the row’s horizontal bounds. No card in that group is interactable or visibly shown before the group reveal starts.

**Acceptance Scenarios**:

1. **Given** a library group on the home page is still fetching its list, **When** the user views that group’s slot, **Then** the group shows only its row-level loading state (no individual cards visible in the carousel area).
2. **Given** a library group’s list has loaded but one or more cards are still preparing displayable content (e.g., cover art not yet ready per existing cover rules), **When** the user views that group, **Then** the row remains in the loading state until every card in that group is ready.
3. **Given** every card in a library group is ready (including cover art or fallback fully shown while the row was hidden), **When** the group reveal runs, **Then** each card slides in from the left into its final position with a short left-to-right stagger (each card starts slightly after the previous), all within the group’s carousel region, with no additional cover fade/bounce starting after landing.
4. **Given** multiple groups on the home page, **When** they finish loading at different times, **Then** each group runs its slide-in reveal independently without waiting for other groups.
5. **Given** a group has completed its slide-in reveal, **When** the user scrolls the horizontal carousel, **Then** cards remain clipped inside the group boundaries and do not draw outside the row during or after the animation.

---

### User Story 2 - Polished motion that respects the carousel layout (Priority: P1)

As a user browsing horizontally within a group, I want the entrance animation to stay inside the group’s visible frame and not spill over adjacent groups or the page edge, so that motion feels contained and intentional.

**Why this priority**: The user explicitly required cards to remain inside group boundaries. Overflowing animation would clash with the non-looping carousel design.

**Independent Test**: Use a group with more than viewport-width cards. After reveal, scroll the carousel and confirm no card animates outside the group’s scroll container; during initial reveal, motion is masked by the group region.

**Acceptance Scenarios**:

1. **Given** a group’s carousel has horizontal overflow, **When** cards slide in, **Then** any off-screen portion of the motion is clipped by the group’s scroll container (not the full page).
2. **Given** carousel scroll controls are shown for a group, **When** cards slide in, **Then** the animation does not overlap or obscure adjacent group headings or unrelated rows.
3. **Given** a group with only one or two entries, **When** the reveal runs, **Then** those entries still slide in from the left within the same bounded region as larger groups.

---

### User Story 3 - Consistent behavior across all home library groups (Priority: P2)

As a user scrolling the albums library home, I want the same group reveal behavior for every curated row (Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights), so the experience feels cohesive.

**Why this priority**: Mixed behavior between rows would feel unintentional. The home page is the primary surface named in the request.

**Independent Test**: Load the home page and observe each non-empty group. Each uses the same wait-for-all-then-slide-in pattern. Random Picks includes the Browse All entry in the same group gate and reveal as the random album cards.

**Acceptance Scenarios**:

1. **Given** the Recently Played, Recently Added, and Hidden Gems groups each have albums, **When** each group becomes ready, **Then** each uses the same group-level wait and slide-in reveal.
2. **Given** the Random Picks group is visible, **When** it reveals, **Then** random album cards and the Browse All entry reveal together after all entries in that row are ready.
3. **Given** the Artist Spotlights group is visible, **When** it reveals, **Then** each spotlight tile is one stagger step in the row; every visible stacked cover layer in each tile finishes load/reveal (or fallback) while the row is hidden, then tiles slide in with the same left-to-right stagger as album groups.
4. **Given** the user opens a category “View all” page or the browse-all grid, **When** those pages load, **Then** they do not use this group slide-in behavior (home groups only).

---

### User Story 4 - Accessible motion and failure handling (Priority: P3)

As a user who prefers reduced motion, or when some card content fails to load, I want the library home to remain usable without endless waiting or distracting movement.

**Why this priority**: Group-level gating must not deadlock the UI; accessibility expectations match existing cover-reveal behavior elsewhere in the app.

**Independent Test**: Enable reduced motion and reload the home page—groups still wait for readiness but appear without horizontal slide. Force a cover load failure in one card of a group— the group still reveals within a reasonable time using existing fallback rules for that card.

**Acceptance Scenarios**:

1. **Given** the user has enabled reduced motion at the system or browser level, **When** a group reveals, **Then** all entries in that group appear at once with a brief shared fade—no horizontal slide and no left-to-right stagger.
2. **Given** one album in a group has missing or failed cover art, **When** existing per-card fallback rules mark that card ready, **Then** the group is not blocked indefinitely and proceeds to reveal with the rest of the group.
3. **Given** a group fails to load and the user retries successfully, **When** data returns, **Then** the group plays the slide-in reveal once for that successful load (not on every background refresh while already visible).
4. **Given** a group has already completed slide-in in this session, **When** the user navigates away and returns to the library home via in-app navigation, **Then** that group appears immediately without slide-in; **Given** a full page reload or active library change, **When** groups load, **Then** slide-in may run again per the normal rules.

---

### Edge Cases

- **Faster group vs slower group**: A ready group reveals while another group’s slot still shows loading; no cross-group animation bleed.
- **Empty group**: Group is hidden per existing rules; no slide-in runs.
- **Single-card group**: One card still slides in from the left within the row bounds.
- **User leaves mid-load**: In-flight reveal for an unmounted group does not affect other pages when the user navigates away.
- **Re-entry to home**: Groups already revealed in the current session skip slide-in when the user returns via in-app navigation; slide-in runs again only on full page reload or when the active music library changes.
- **Horizontal scroll during reveal**: Reveal completes without breaking scroll position or carousel non-loop rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On the albums library home page, each curated group MUST remain in its row-level loading state until every entry in that group is ready to display full card content (title, artist or equivalent labels, and cover or fallback per existing album cover rules).
- **FR-002**: When a group’s readiness gate passes, the system MUST reveal all entries in that group using a per-card left-to-right slide-in with a short stagger (each entry starts slightly after the previous, in carousel order); each entry MUST already display its final cover (or fallback) and text before its slide begins—no per-card cover fade/bounce may start after landing.
- **FR-003**: During and after the slide-in animation, entry positions MUST stay clipped within that group’s horizontal carousel container so nothing visually escapes the group boundaries.
- **FR-004**: The slide-in reveal MUST run per group independently, without requiring other groups on the page to finish loading first.
- **FR-005**: Until a group’s reveal begins, individual entries in that group MUST NOT be visible or interactive (no play overlay, no navigation from partially shown cards).
- **FR-006**: The Random Picks group MUST treat all row entries—including the Browse All tile—as one set for the readiness gate and coordinated slide-in.
- **FR-007**: The Artist Spotlights group MUST use the same group-level readiness gate and staggered slide-in pattern as album groups; each spotlight tile counts as one carousel entry for stagger order, and every visible stacked cover layer in that tile MUST reach its final state (per existing cover rules) while the row is hidden before the group gate opens.
- **FR-008**: Category “View all” pages, browse-all grids, and other non-home album lists MUST NOT use this group slide-in behavior.
- **FR-009**: When reduced motion is preferred, the system MUST suppress horizontal slide and stagger; all entries in the group MUST appear at once with a brief shared fade while keeping the group-level readiness gate.
- **FR-010**: If any entry in a group cannot load cover art, the system MUST apply existing per-card fallback timing so the group can still complete its readiness gate within a reasonable bounded wait.
- **FR-011**: After a group has revealed, horizontal carousel behavior (non-looping scroll, scroll controls, uniform card size) MUST remain unchanged from current library home rules.
- **FR-012**: A group that has completed its slide-in reveal in the current app session MUST NOT play slide-in again when the user returns to the library home via in-app navigation; slide-in MAY run again after a full page reload or when the user switches the active music library.

### Key Entities

- **Library group**: A named curated row on the albums home (e.g., Recently Played) with its own async data fetch, loading slot, horizontal carousel, and optional “View all” link.
- **Group entry**: A single item in a group row—album card, Browse All tile, or artist spotlight tile (one tile = one stagger step; a tile may contain multiple visible stacked cover layers, all of which must be ready before the gate opens).
- **Readiness gate**: The condition that every entry in one library group has displayable content before any group reveal animation starts.
- **Group reveal**: The coordinated entrance motion (slide-in from the left) applied to all entries in one library group at once.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In user testing with simulated slow networks, 100% of observed home groups show no visible card content until all entries in that group are ready, then reveal within 1 second of the last entry becoming ready.
- **SC-002**: At least 90% of test observers describe the home library loading experience as “smooth” or “polished” when comparing before/after on the same library (qualitative survey or structured feedback).
- **SC-003**: Zero reported cases in acceptance testing of cards animating outside their group row boundaries during slide-in on standard desktop and mobile viewport widths.
- **SC-004**: Users with reduced motion enabled can complete browsing and play actions on the home page without horizontal slide or staggered entry motion; groups still avoid partial-row pop-in by waiting for the readiness gate, then revealing all entries together via a brief shared fade.
- **SC-005**: No group remains stuck in loading state beyond the existing per-card cover fallback timeout when at least one cover fails, for 100% of failure-injection test cases.

## Assumptions

- “Library page” means the albums library home with curated groups, not album detail, search, or Discogs collection views.
- “All the info for all the cards” means each entry is ready for its established display rules (metadata from the group response plus cover loaded, failed with fallback, or absent cover handled per existing album cover behavior).
- Slide-in applies to visible carousel entries only; off-screen entries in the same group are included in the coordinated reveal but may finish motion while still partially off-screen, clipped by the carousel.
- Group reveal uses a short left-to-right stagger between entries (carousel order); the readiness gate opens once all entries are ready, then staggered slides run without re-opening the gate for later cards.
- Re-animation on silent background refresh is out of scope; reveals target initial load, user-triggered group retry, full page reload, or active library change—not repeat in-app visits to home in the same session.
- Per-card cover fade/bounce (where already specified) runs while the group row is hidden; once every entry (including all visible stacked cover layers on each artist spotlight tile) has reached its final visual state, the group slide-in is the only visible entrance motion on that row.

## Dependencies

- Albums library home layout with independent async groups, uniform card sizing, and non-looping horizontal carousels (library view refactor).
- Existing album cover load and reveal rules on album cards (wait for image, fallback on failure, reduced-motion handling).
- Row-level loading and per-group error retry behavior on the home page.
