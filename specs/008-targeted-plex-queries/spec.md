# Feature Specification: Targeted Library Queries

**Feature Branch**: `008-targeted-plex-queries`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Create smarter Plex queries (e.g. only fetch metadata needed for 'recently added') for the Library view instead of the full catalog"

## Clarifications

### Session 2026-05-20

- Q: Must Random Picks match a full-catalog shuffle on each visit, or is a bounded random pool acceptable? → A: **Bounded pool** — uniform random selection within a capped candidate set; picks vary across visits and are not required to match a full-catalog shuffle.
- Q: When remote sort/filter is unavailable, what is the maximum fallback scan budget per group? → A: **Fixed cap** — scan at most N albums per group request (N set in planning); return the best-ranked results found within that cap.
- Q: Under capped fallback scan, must deterministic groups still match full-catalog selection? → A: **Remote-first** — equivalence to full-catalog rules when remote sort/filter succeeds; capped fallback returns best-ranked within N (degraded mode, not SC-004 equivalent).
- Q: How should the Random Picks candidate pool be composed? → A: **Hybrid** — union of two capped slices (e.g. recent-by-added M₁ plus alphabetical or artist-stratified M₂); uniform random draw across the union.
- Q: How should home preview (10) and View all (20) relate within a cache window? → A: **Single fetch to 20** — one query per group profile retrieves up to 20; home shows the first 10, View all shows all 20 from the same cached result set.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Library home groups load without waiting for the full catalog (Priority: P1)

As a user opening the albums library home, I want each curated group (Recently Played, Recently Added, Hidden Gems, Random Picks, Artist Spotlights) to become available as soon as that group’s own data is ready, without the application first loading every album in my library, so that large collections feel responsive and I can start browsing within seconds.

**Why this priority**: After the library view refactor, groups load in parallel but still depend on a full-catalog fetch behind the scenes. For libraries with tens of thousands of albums, that work dominates load time and undermines progressive loading.

**Independent Test**: On a library with at least 5,000 albums, open the library home and observe that the first group with the lightest data requirements (e.g., Recently Added) appears materially sooner than a full-catalog scan would allow, while other groups continue loading independently.

**Acceptance Scenarios**:

1. **Given** a large library (5,000+ albums), **When** the user opens the library home, **Then** at least one curated group becomes visible and interactive before the application has retrieved metadata for every album in the library.
2. **Given** multiple groups are requested in parallel, **When** Recently Added needs only addition-date ordering, **Then** that group’s data request does not require play history, user ratings, or full track-level metadata for the entire catalog.
3. **Given** a group finishes loading, **When** the user interacts with its cards (play, details, horizontal scroll), **Then** behavior matches the existing library home experience defined in the library view refactor (card size, limits, carousel, no regression in play or navigation).
4. **Given** one group’s targeted fetch fails, **When** other groups succeed, **Then** per-row error and retry behavior from the library view refactor still applies only to the failed group.

---

### User Story 2 - Each curated group requests only the metadata its rules require (Priority: P1)

As a user browsing curated groups, I want the application to fetch only the fields needed to rank and display albums for that specific category, so that unnecessary library-wide work is not repeated for every group.

**Why this priority**: Different groups use different signals (add date, 30-day play counts, ratings, neglect, artist album counts). Loading a uniform superset for every group wastes time and bandwidth on large libraries.

**Independent Test**: For each group type, verify that the data retrieved is sufficient to produce the same top-N results as today (per existing selection rules) without pulling unrelated attributes for the whole catalog when the provider supports narrower queries.

**Acceptance Scenarios**:

1. **Given** the Recently Added group (home preview up to 10, View all up to 20), **When** data is loaded, **Then** the application obtains enough metadata to sort by library addition date (newest first) and render album cards (title, artist, cover) without requiring 30-day play counts or full scrobble history for every album.
2. **Given** the Recently Played group, **When** data is loaded, **Then** the application obtains play activity for the trailing 30-day window and the fields needed to rank by play count (and tie-break by last played), without requiring user star ratings for every album unless needed for ranking.
3. **Given** the Hidden Gems group, **When** data is loaded, **Then** the application obtains user ratings and last-played timestamps sufficient to apply the existing rating floor and neglect threshold, without loading track lists or other playback-unrelated bulk metadata for the full catalog when avoidable.
4. **Given** the Artist Spotlights group, **When** data is loaded, **Then** the application obtains per-artist album counts and the album art/titles needed for stacked tiles and play-all ordering, without requiring a full track catalog fetch.
5. **Given** Random Picks, **When** data is loaded, **Then** the application selects up to 10 (home) or 20 (View all) albums by uniform random draw from a bounded candidate pool (not a full-catalog shuffle), picks differ across re-entries when the pool or draw changes, and no full-catalog read is required on every home visit for large libraries.
6. **Given** any group’s home or View all request, **When** results are returned, **Then** album ordering and membership match the same eligibility and sort rules as the albums library view and library view refactor specifications (limits 10 home / 20 View all, same hidden/empty group rules). The home row shows the first 10 entries of the same ranked or random result set used for View all (up to 20).

---

### User Story 3 - Full alphabetical browse remains a deliberate, separate path (Priority: P2)

As a user who wants to explore the entire collection A–Z, I want the Browse All Albums flow to remain available without forcing the library home to pay the cost of a full catalog load up front, so that casual browsing stays fast while exhaustive browse is opt-in.

**Why this priority**: Some use cases legitimately need the full library (alphabetical list, search within browse). Those should not block the curated home experience.

**Independent Test**: From Random Picks, open Browse All Albums and confirm paginated or incremental loading still works; returning to the library home does not require re-fetching the entire catalog if cached freshness rules allow reuse.

**Acceptance Scenarios**:

1. **Given** the user opens the library home, **When** they do not open Browse All Albums, **Then** the application does not need to load the complete alphabetical album index as a prerequisite for showing curated groups.
2. **Given** the user opens Browse All Albums from the home row, **When** the A–Z view loads, **Then** albums load in pages or chunks suitable for large libraries (existing browse behavior preserved).
3. **Given** the user returns from Browse All to the library home within the freshness window, **When** groups are still valid, **Then** already-loaded groups are shown without forcing a new full-catalog scan solely because browse was opened.

---

### Edge Cases

- What happens when the connected library provider cannot sort or filter remotely for a given group? The application falls back to a bounded local scan with a **fixed maximum of N albums per request** (N defined in planning). Scanning stops at N; return the best-ranked qualifying results found (**degraded mode**—may differ from a full-catalog pass). Deterministic groups MUST prefer remote sort/filter so the normal path preserves equivalence with today’s selection rules.
- What happens when partial metadata is missing (no added date, no rating, no play history)? Existing hide-empty-group and qualification rules apply; groups with zero qualifiers stay hidden.
- What happens when two parallel group requests would previously share one in-memory catalog? Targeted fetches MAY share a short-lived cache keyed by library and query profile, but MUST NOT force every group to wait on the slowest full-catalog path.
- What happens on library switch? Prior library caches are not reused; each library’s groups load with targeted queries for the active library only.
- What happens when View all requests 20 items but the home row showed 10? View all reuses the cached result set from the group’s single fetch-to-20 (no duplicate query within the cache window); if the cache expired, one new fetch retrieves up to 20 again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The library home MUST load each curated group using a data request scoped to that group’s selection rules, not by requiring a single full-catalog metadata load before any group can render.
- **FR-002**: The Recently Added group MUST be servable using addition-date and display metadata only, without depending on a library-wide play-count or rating fetch.
- **FR-003**: The Recently Played group MUST be servable using 30-day play activity and display metadata sufficient for existing ranking (play count, then last played).
- **FR-004**: The Hidden Gems group MUST be servable using user rating and last-played metadata sufficient for existing rating and neglect rules.
- **FR-005**: The Artist Spotlights group MUST be servable using artist-to-album relationships and display metadata sufficient for eligibility (>2 albums per artist), round-robin selection, and stacked-tile presentation without a full track listing for every album.
- **FR-006**: Random Picks MUST draw uniformly at random from a **hybrid bounded candidate pool**: the union of (1) a capped recent-by-added slice and (2) a capped alphabetical or artist-stratified slice (sizes M₁, M₂ set in planning), without a full-catalog read on each home visit; results are NOT required to match a full-catalog shuffle, but MUST change across re-entries per existing freshness behavior.
- **FR-007**: Each group profile MUST retrieve up to 20 items per cache window in a single targeted query; the home row displays the first 10 and View all displays up to 20 from that same result set without a second full query for the same profile within the cache window.
- **FR-008**: For each deterministic group (Recently Played, Recently Added, Hidden Gems, Artist Spotlights), returned albums MUST match the ordering, eligibility, and limits from the albums library view and library view refactor specifications when remote sort/filter succeeds. On capped local fallback only, the group MUST return the best-ranked qualifying results within the scan cap (degraded mode).
- **FR-009**: Browse All Albums MUST remain an on-demand path that loads the full library incrementally and MUST NOT be a prerequisite for initial library home render.
- **FR-010**: Parallel group requests MUST remain independent; a slow or heavy fallback for one group MUST NOT block other groups from completing.
- **FR-011**: When targeted queries hit provider or network errors, the application MUST surface the same per-row retry behavior as the library view refactor (automatic retry once, then manual Retry for that group only).
- **FR-012**: Short-lived caching MUST reuse the same up-to-20 result set per library and query profile within the freshness window (including home-then-View-all navigation), without reintroducing a mandatory full-catalog fetch for all groups.
- **FR-013**: When the connected library cannot satisfy a group’s sort or filter remotely, the application MUST use a local scan bounded by a fixed maximum album count N per request (N set in planning); it MUST NOT fall back to an unbounded or full-catalog scan for that group.

### Key Entities

- **Library query profile**: A named set of metadata fields and sort/filter rules for one curated group (e.g., recently added, recently played). Determines what is requested from the connected library.
- **Random Picks candidate pool**: Union of two capped album slices (recent-by-added and alphabetical/artist-stratified) from which home and View all draws are taken uniformly at random.
- **Curated group result**: Ordered list of albums or artist spotlights for home (≤10) or View all (≤20), with display fields for cards and play actions.
- **Catalog browse session**: Paginated access to the full alphabetical album list, used only when the user opts into Browse All Albums.
- **Play activity window**: Rolling 30-day play counts and last-played timestamps used for Recently Played ranking.
- **Artist eligibility map**: Artists with more than two albums in the library, used for spotlight selection and round-robin state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a library with at least 5,000 albums, the first curated group on the library home becomes visible within 3 seconds under typical home network conditions, without waiting for full-catalog metadata retrieval.
- **SC-002**: On the same large library, opening the library home completes initial rendering of all groups that qualify within 15 seconds, or shows per-row loading/retry states—not a single blocking spinner for the entire page. Fallback local scans respect the fixed per-request album cap N so no single group triggers an unbounded catalog read.
- **SC-003**: Compared to the pre-change baseline (full catalog per group backend path), total metadata retrieved for a cold library home load on a 10,000-album library is reduced by at least 50% as measured by equivalent album records or payload size in acceptance testing.
- **SC-004**: On fixture libraries where remote sort/filter succeeds, 100% of acceptance tests for deterministic groups (Recently Played, Recently Added, Hidden Gems, Artist Spotlights) match the pre-change album sets and order. Random Picks is exempt (pool-bounded random). Capped-fallback fixtures are tested separately: results are best-within-N, not full-catalog equivalent.
- **SC-005**: Users can open Browse All Albums and load the first page of the A–Z list without regression in time-to-first-page versus the current browse experience.

## Assumptions

- The connected library is Plex, accessed through the existing Dexaudio Plex connection; provider-specific capabilities (sort keys, filters, pagination) will be evaluated during planning, with bounded local fallbacks where remote filtering is unavailable.
- Selection rules, group labels, limits (10 home / 20 View all), carousel behavior, and View all routes remain as specified in `006-library-view-refactor` and `003-albums-library-view`; this feature changes how data is fetched, not what users see when data is available.
- Album card display fields (title, artist, cover art, identifiers for play and details) remain required for every returned item.
- Artist spotlight round-robin state continues to use the existing persistence mechanism; only the album/artist metadata loading path is optimized.
- Random Picks uses a hybrid bounded pool (recent slice ∪ stratified/alphabetical slice) with uniform random selection; M₁, M₂, and fallback cap N are set in planning.
- No change to authentication, Plex pairing, or frontend routing contracts beyond what is needed to preserve existing API responses for group endpoints.

## Dependencies

- **006-library-view-refactor**: Independent per-group endpoints and progressive UI are in place; this feature optimizes their data layer.
- **003-albums-library-view**: Group definitions, eligibility, and sort orders are the behavioral source of truth.
- Connected Plex server reachable with the user’s configured music library.
