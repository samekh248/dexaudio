# Feature Specification: Albums Library View

**Feature Branch**: `003-albums-library-view`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description (from Linear project [List albums in library view](https://linear.app/audiodex/project/list-albums-in-library-view-e811f93b1db7/overview)): "This view will allow the user to select an album to listen to. The view will list albums in card view. Each card will show the album cover prominently in the card. On hover, a play button (translucent) will show, that will let them immediately start playing the album. There should be an area of the card that will allow them to click into the details of the album. The list of albums will be broken into groups: Top 5 listened to albums within the past month, Top 5 latest added albums, Top 5 top rated albums that haven't been listened to in a while, 5 random albums in library, and 5 groupings of albums from artists that have more than 2 albums in the library — the visual will look like stacked albums and the playlist will be all those albums played back to back, ordered from oldest to newest album. If a group is empty, hide the group. For the 5 random albums in library group, have a larger visual attached that lets them view the whole library, in alphabetical order. In the ordering, albums that start with 'The' will be sorted by the second word."

## Clarifications

### Session 2026-05-19

- Q: Minimum user rating for an album to qualify for the Hidden Gems group? → A: 3+ stars (or 6+ on a 10-point scale).
- Q: Play button clicked on the album currently playing — what happens? → A: Restart album from track 1 and switch to Now Playing view.
- Q: How are the 5 Artist Spotlight tiles selected on each visit? → A: Least-recently-shown round-robin — track when each eligible artist was last surfaced, pick the 5 oldest (artists never shown are treated as oldest).
- Q: Relationship to the existing flat albums page (`AlbumGridPage`)? → A: Replace it — the grouped view becomes the canonical albums page; the flat A–Z list is reached only via the "Browse All Albums" tile inside Random Picks.
- Q: Hidden Gems "neglect threshold" duration? → A: 3 months without a scrobble.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse curated album groups on the library landing view (Priority: P1)

As a user with a synced music library, I want to land on a visually rich albums view that organizes my collection into a handful of meaningful, bite-sized groups (recently played, recently added, hidden gems, random picks, artist deep-dives), so that I can quickly choose something to listen to without scrolling through the entire library.

**Why this priority**: This is the primary jumping-off point for music playback. Without it, the user faces a flat, undifferentiated list of every album in the library and has no curated suggestions for what to play next. The grouped landing view is the headline experience of the feature.

**Independent Test**: A user with a populated library can open the albums view and immediately see up to five labeled groups, each showing up to five album cards with prominent cover art. Each non-empty group renders its appropriate set of albums (most-listened in past 30 days, newest additions, neglected top-rated, random picks, multi-album artists). Empty groups do not appear.

**Acceptance Scenarios**:

1. **Given** the user has at least one album scrobbled in the last 30 days, **When** the albums view loads, **Then** a "Recently Played" group displays up to 5 album cards ordered by play count in the past 30 days (most played first).
2. **Given** the library contains at least one album added in the last year (or any added albums), **When** the albums view loads, **Then** a "Recently Added" group displays up to 5 album cards ordered by added-date (newest first).
3. **Given** the library contains at least one album with a user rating of 3 stars or higher (≥6 on a 10-point scale) that has not been scrobbled within the neglect threshold, **When** the albums view loads, **Then** a "Hidden Gems" group displays up to 5 album cards (highest-rated, least-recently-played first).
4. **Given** the library contains at least one album, **When** the albums view loads, **Then** a "Random Picks" group displays up to 5 randomly selected album cards plus a larger "Browse All Albums" tile that opens the full alphabetical library view.
5. **Given** the library contains at least one artist with more than 2 albums, **When** the albums view loads, **Then** an "Artist Spotlights" group displays up to 5 artist tiles, each rendered as a stacked-album visual. The 5 artists are chosen by least-recently-shown round-robin (artists never previously shown are treated as oldest); the selection timestamp for each shown artist is updated on this load so subsequent visits surface different artists.
6. **Given** a group has no qualifying albums (e.g., no scrobbles yet, no rated albums, no multi-album artists), **When** the albums view loads, **Then** that group is hidden entirely — no empty header, no placeholder, no skeleton.
7. **Given** all five groups are empty (e.g., a freshly synced library with no plays or ratings), **When** the albums view loads, **Then** only the Random Picks and Browse All groups remain visible because they only require albums to exist.

---

### User Story 2 - Start playing an album directly from its card (Priority: P1)

As a user browsing the albums view, I want to start playing an album with a single click on its card and be taken straight to the Now Playing view, so that I can begin listening and immediately see what's playing with minimal friction.

**Why this priority**: Fast playback is the core value proposition of a music app. The hover-to-play affordance must be immediate and unambiguous; without it, every play action requires an extra navigation step into album details, which adds friction to the most common task. Routing the user to the Now Playing view after they start an album reinforces that playback began and gives them immediate access to playback controls, the queue, and track context.

**Independent Test**: With a populated albums view, hovering an album card reveals a translucent play button overlay on the cover art. Clicking the play button immediately starts playback of that album from track 1, replaces the queue with the album's tracks, and switches the main view to the Now Playing view showing the just-started album.

**Acceptance Scenarios**:

1. **Given** an album card is rendered, **When** the user hovers (or focuses with keyboard) the card, **Then** a translucent play button overlay appears over the album cover with smooth fade-in.
2. **Given** the play overlay is visible, **When** the user clicks the play button, **Then** the album's tracks are queued in their natural order, the first track begins playing, and the main view switches to the Now Playing view displaying the just-started album.
3. **Given** the play overlay is visible, **When** the user moves the cursor or focus away from the card, **Then** the overlay fades out and the bare cover art is restored.
4. **Given** a touch-only device (no hover), **When** the user taps the play button area, **Then** the album begins playing and the main view switches to the Now Playing view exactly as on hover-capable devices.
5. **Given** an album is already playing, **When** the user clicks the play button on a different album, **Then** the current queue is replaced with the new album, playback resumes with the first track of the new album, and the main view switches to (or remains on) the Now Playing view reflecting the new album.
6. **Given** an album is currently playing, **When** the user clicks the play button on the same album from the albums view, **Then** the album restarts from track 1 (queue is rebuilt and playback position resets to 0:00) and the main view switches to the Now Playing view.
7. **Given** the user lands on the Now Playing view after starting an album from the albums view, **When** they use browser/back navigation (or an explicit "back" affordance), **Then** they return to the albums view with their previous scroll position and group state preserved while playback continues uninterrupted.

---

### User Story 3 - Navigate into album details from the card (Priority: P1)

As a user, I want a distinct area of the album card that opens the album details page (track list, metadata, ratings), so that I can inspect or pick a specific track before playing.

**Why this priority**: Hover-to-play and details-navigation must coexist on the same card without ambiguity. If clicking the card always navigates, fast playback is broken; if clicking always plays, the user has no way to reach the detail page from this view.

**Independent Test**: On an album card, the play button overlay triggers playback only; clicking any other clickable area of the card (cover area outside the play button, title, artist name) navigates to that album's detail page. Keyboard users can distinguish the two affordances via tab order and accessible labels.

**Acceptance Scenarios**:

1. **Given** an album card is rendered, **When** the user clicks the album title, artist name, or the cover area outside the play button overlay, **Then** the application navigates to that album's detail page.
2. **Given** an album card is rendered, **When** a keyboard user tabs through the card, **Then** the play button and the details link are reachable as separate focusable elements with descriptive accessible labels (e.g., "Play <Album Title>", "Open details for <Album Title>").
3. **Given** the user navigates to album details and then uses browser/back navigation, **When** they return to the albums view, **Then** the previous scroll position and group state are preserved.

---

### User Story 4 - Open Artist Spotlight to play an artist's discography in order (Priority: P2)

As a user, I want the Artist Spotlight tiles to play every album by that artist back-to-back in chronological order (oldest to newest), so that I can experience a focused listening session for an artist with deep catalogue.

**Why this priority**: Artist Spotlight is a distinctive feature beyond the standard "play an album" interaction; it turns the view into a discovery and deep-listen surface. It is not required for the basic browse-and-play loop (Stories 1–3) to deliver value, so it is P2.

**Independent Test**: An artist tile in the Artist Spotlights group, when activated, queues every album by that artist in the library, ordered oldest-to-newest by release year, and begins playback at the first track of the earliest album.

**Acceptance Scenarios**:

1. **Given** an artist tile shows a stacked-album visual for an artist with N (>2) albums, **When** the user activates the tile's play affordance, **Then** all N albums are queued in oldest-to-newest order by release year (or original-release year when available), the first track of the earliest album begins playing, and the main view switches to the Now Playing view.
2. **Given** the user activates an artist tile's details/clickthrough area (not the play affordance), **When** the click resolves, **Then** the application navigates to the artist's albums page where all albums by that artist are listed.
3. **Given** two albums by the same artist share a release year, **When** they are queued from the Artist Spotlight, **Then** their relative order is stable across visits (e.g., by title, then by album ID) so the user gets a consistent experience.
4. **Given** an artist has exactly 2 albums in the library, **When** the albums view loads, **Then** that artist does NOT appear in Artist Spotlights (more than 2 albums is the threshold).

---

### User Story 5 - Browse the entire library alphabetically with "The"-aware sorting (Priority: P2)

As a user, I want to open a full alphabetical view of every album in my library from a prominent "Browse All Albums" tile inside the Random Picks group, with albums whose titles start with "The" sorted by the next significant word, so that I can find an album by name without quirky ordering.

**Why this priority**: Once the curated groups are working, users need an escape hatch into the full library. The "The"-aware sort is a small but high-quality-of-life touch that matches how listeners think about album titles.

**Independent Test**: Clicking the "Browse All Albums" tile opens an A–Z view of every album in the library. The albums "The Beatles - Revolver", "The Wall", and "Abbey Road" sort as Abbey Road, Revolver, The Wall (i.e., "The Beatles - Revolver" is sorted as "Beatles..." and "The Wall" is sorted as "Wall"). Pagination or infinite scroll allows the user to browse the full collection.

**Acceptance Scenarios**:

1. **Given** the Random Picks group is rendered, **When** the user views it, **Then** a visually larger "Browse All Albums" tile is present alongside the 5 random album cards.
2. **Given** the user activates the "Browse All Albums" tile, **When** the navigation resolves, **Then** an alphabetical A–Z view of every album in the library is displayed.
3. **Given** the alphabetical view is displayed, **When** sorting is applied, **Then** albums whose titles begin with the leading article "The " (case-insensitive, followed by a space) sort by the second word; the article is still shown in the displayed title but ignored for sort.
4. **Given** an album title begins with a different leading article (e.g., "A", "An"), **When** sorting is applied, **Then** the article is NOT stripped — only "The" triggers second-word sorting (per the explicit project requirement).
5. **Given** a very large library (e.g., 10,000+ albums), **When** the alphabetical view is opened, **Then** initial render happens within an interactive timeframe (under 2 seconds for first content paint) and the user can scroll smoothly without UI stutter.

---

### Edge Cases

- **Empty library**: When no albums have been synced yet, the view displays a single empty-state message guiding the user to sync their library — no group headers are rendered.
- **Library with very few albums (<5)**: Each affected group shows whatever it has (e.g., a Recently Added group with 3 albums shows 3 cards) rather than padding or hiding the group. Hidden only if the group truly has zero qualifying albums.
- **No scrobble history at all**: The Recently Played group is hidden. The Hidden Gems group is hidden (it requires both ratings and listening history to determine "neglect"). Other groups remain.
- **No rated albums (or no albums rated 3+ stars)**: The Hidden Gems group is hidden — a rating must meet the 3-star floor to count.
- **Only one or two multi-album artists**: Artist Spotlights shows fewer than 5 tiles (e.g., 1 or 2) and does not pad with single-album artists. The shown artists' `last_spotlighted_at` timestamps are still updated, even though rotation is moot until the eligible-artist pool grows.
- **Newly eligible artist appears (e.g., user adds a 3rd album by an existing artist)**: The artist enters the rotation with a null `last_spotlighted_at`, so they are treated as oldest and surfaced on the next view load.
- **Album cover art missing**: A consistent placeholder is shown in card and tile visuals so layouts remain stable. Hover-to-play and details navigation continue to work.
- **Very long album or artist names**: Titles truncate with ellipsis but full text is available via tooltip on hover and via the accessible name for screen readers.
- **Random Picks freshness**: The set of 5 random albums refreshes when the view is re-opened from another route or on explicit user refresh — it does not change while the user is scrolling within the view.
- **Albums starting with "The" but no second word**: An album literally titled "The" (no following word) sorts under "T".
- **Albums whose title is a leading non-letter (e.g., "..." or "9 Crimes")**: Numbers sort before letters; punctuation-only titles sort to the start. Standard alphabetic locale rules apply otherwise.
- **Recently played album crosses the 30-day boundary**: The Recently Played group only counts scrobbles within the trailing 30 days at view-load time; an album whose plays all fall outside the window stops appearing.
- **Hidden Gem becomes recently played**: If a Hidden Gems candidate gets played, on next load it is no longer "neglected" and will be excluded from the group.
- **Hover overlay interferes with cover image accessibility**: The play button overlay does not obscure the album title/artist text rendered below or beside the cover; only the cover image itself is overlaid.
- **User starts an album while already on the Now Playing view**: The Now Playing view updates in place to reflect the new album and queue — no extra navigation occurs, but the visible content changes to the just-started album.
- **User clicks play on the currently-playing album**: Playback restarts from track 1 (queue rebuilt, position reset to 0:00) and the view switches to Now Playing. The action is deliberate "play this from the top", not a no-op.
- **Switch to Now Playing during a slow track load**: The view switches as soon as the queue is set, even if the first track is still buffering, so the user immediately sees the album they just started rather than staying on the albums view in a frozen-looking state.

## Requirements *(mandatory)*

### Functional Requirements

#### View structure

- **FR-001**: The application MUST present an albums view that displays albums as visual cards organized into named, ordered groups.
- **FR-001a**: The new grouped albums view MUST replace the existing flat albums page as the canonical "Albums" destination in the application's primary navigation. The existing flat-grid albums route MUST no longer be linked from any primary navigation entry, sidebar item, breadcrumb, or default landing path.
- **FR-001b**: The full alphabetical (A–Z) flat album list MUST be reachable only via the "Browse All Albums" tile inside the Random Picks group (per FR-010 / FR-023). Any deep links or bookmarks that previously targeted the flat albums page MUST resolve (via redirect or equivalent) to the new grouped albums view; no broken-link experiences are acceptable.
- **FR-002**: The albums view MUST render the following groups, in this order, when each group has at least one qualifying entry: (1) Recently Played, (2) Recently Added, (3) Hidden Gems, (4) Random Picks, (5) Artist Spotlights.
- **FR-003**: A group with zero qualifying entries MUST be omitted entirely from the rendered output (no header, no skeleton, no placeholder card).
- **FR-004**: Each group MUST display up to 5 entries (albums or, in the case of Artist Spotlights, artists), in the order defined for that group.
- **FR-005**: When a group has fewer than 5 qualifying entries, the group MUST render only the entries it has (no padding, no synthetic entries).

#### Group definitions

- **FR-006**: The Recently Played group MUST contain the up-to-5 albums with the highest play count from the user's listening history in the trailing 30 days, ordered by play count descending (ties broken by most-recent scrobble).
- **FR-007**: The Recently Added group MUST contain the up-to-5 most recently added albums in the library, ordered by added-date descending.
- **FR-008**: The Hidden Gems group MUST contain the up-to-5 albums that (a) have a user rating of **3 stars or higher** (or ≥6 on a 10-point scale), (b) have not been scrobbled within the neglect threshold of **3 months**, ordered by rating descending then by least-recent scrobble (or never scrobbled) first.
- **FR-009**: The Random Picks group MUST contain 5 albums (or all albums if the library has fewer than 5) chosen uniformly at random from the library, refreshed each time the view is loaded.
- **FR-010**: The Random Picks group MUST include, alongside the 5 random album cards, a visually larger "Browse All Albums" tile that opens the full alphabetical library view.
- **FR-011**: The Artist Spotlights group MUST contain up to 5 tiles representing artists in the library who have more than 2 albums in the library. Tile selection MUST follow least-recently-shown round-robin: the application MUST track, per eligible artist, the timestamp it was last surfaced in this group; on each view load it MUST select the 5 eligible artists with the oldest "last shown" timestamps (artists never previously shown are treated as oldest, with ties broken by stable identifier for determinism). Upon selection, each chosen artist's "last shown" timestamp MUST be updated to the current load time so subsequent visits surface different artists. If fewer than 5 eligible artists exist, all of them are shown and the group is not padded.
- **FR-012**: Each Artist Spotlight tile MUST render as a stacked-album visual that conveys "multiple albums" at a glance (e.g., layered cover-art thumbnails) and MUST display the artist's name.

#### Card interactions

- **FR-013**: Each album card MUST display the album's cover art prominently as the dominant visual element of the card.
- **FR-014**: Each album card MUST display the album title and artist name in a legible position outside or beneath the cover overlay area.
- **FR-015**: When a user hovers (mouse) or focuses (keyboard) an album card, a translucent play button MUST appear overlaid on the cover art.
- **FR-016**: Activating the play button (click, Enter, Space, or tap) MUST begin playback of the album from its first track, replace the current play queue with the album's track list in natural order, AND switch the main view to the Now Playing view showing the just-started album.
- **FR-016a**: The transition to the Now Playing view MUST happen as part of the same user action that started playback (no additional click required) and MUST occur after the play queue has been updated so the Now Playing view renders the new album rather than any previously-playing content.
- **FR-016b**: After the automatic switch to the Now Playing view, using browser/back navigation (or an equivalent in-app back affordance) MUST return the user to the albums view with prior scroll position and group state preserved, and MUST NOT interrupt playback.
- **FR-016c**: When the user activates the play button on an album that is already the currently-playing album, the application MUST restart playback from track 1 (rebuild the queue from the album's tracks in natural order and reset the playback position to 0:00) and switch to the Now Playing view. The "same album" check uses the album's stable identifier, not its title.
- **FR-017**: Activating any clickable area of the card other than the play button (e.g., title text, artist text, or the cover region outside the play button) MUST navigate the user to the album detail page (and MUST NOT trigger playback or the Now Playing switch).
- **FR-018**: The play button and the detail-navigation affordance MUST each be independently reachable by keyboard and MUST each expose an accessible name that identifies the album (e.g., "Play <Album Title>", "Open details for <Album Title>").
- **FR-019**: On touch-only devices that do not emit hover events, the play button MUST be reachable via a tap on the cover area without first requiring a separate "show controls" gesture.

#### Artist Spotlight interactions

- **FR-020**: Activating the play affordance on an Artist Spotlight tile MUST queue every album by that artist that is currently in the library, ordered oldest-to-newest by release year (or original-release year where available), begin playback at the first track of the earliest album, AND switch the main view to the Now Playing view (consistent with FR-016 / FR-016a).
- **FR-021**: When two albums by the same artist share a release year, their relative order in the queue MUST be deterministic and stable across visits (secondary sort by album title, tertiary by stable identifier).
- **FR-022**: Activating the details/clickthrough affordance on an Artist Spotlight tile MUST navigate to a page listing all albums by that artist.

#### Browse-all-albums view and sorting

- **FR-023**: Activating the "Browse All Albums" tile MUST open an alphabetical (A–Z) view containing every album in the library.
- **FR-024**: In the alphabetical view, albums whose titles begin with the leading article "The " (case-insensitive, followed by whitespace) MUST sort by the next word in the title; the article MUST still appear in the displayed title but MUST be ignored for sort.
- **FR-025**: Other leading articles ("A", "An") MUST NOT be stripped for sort purposes — only "The" triggers second-word sorting (explicit project requirement).
- **FR-026**: Album titles starting with numerals or punctuation MUST follow standard locale-aware sort behavior (numerals before letters; punctuation-only at the start).
- **FR-027**: The alphabetical view MUST render efficiently for libraries containing at least 10,000 albums without UI stutter (via virtualization, pagination, or equivalent technique).

#### State, freshness, and persistence

- **FR-028**: The Random Picks selection MUST be stable for the duration of a single view session and MUST refresh whenever the view is re-entered from another route or explicitly refreshed by the user.
- **FR-029**: When the user navigates from the albums view to an album detail page and returns via browser/back navigation, the previous scroll position within the albums view MUST be preserved.
- **FR-030**: Group contents (Recently Played, Recently Added, Hidden Gems, Artist Spotlights) MUST reflect the current state of the user's library and listening history at the time the view is loaded; no manual refresh is required by the user.

#### Performance and accessibility

- **FR-031**: First meaningful paint of the albums view MUST occur in under 2 seconds on a representative library (≈1,000 albums) on a typical broadband connection.
- **FR-032**: Album cover images MUST be lazy-loaded (off-screen images deferred) to keep the view responsive on libraries with many albums.
- **FR-033**: All interactive elements (play buttons, detail links, browse-all tile, artist spotlight tiles) MUST be operable by keyboard alone and MUST expose appropriate ARIA labels and focus indicators.
- **FR-034**: Group headings MUST be marked up as proper headings so assistive technology users can navigate between groups.

### Key Entities

- **Album**: A music album in the user's library. Key attributes for this feature: title, artist (reference), cover art reference, added date, release year, user rating (optional), play count in the trailing 30 days (derived from scrobble history), most-recent-scrobble timestamp (derived).
- **Artist**: A music artist with one or more albums in the library. Key attributes for this feature: name, count of albums in the library, ordered list of albums for play-all-in-order behavior, and a `last_spotlighted_at` timestamp (nullable) recording the most recent time the artist appeared in the Artist Spotlights group — used to drive least-recently-shown round-robin selection.
- **Album Group**: A named, ordered collection of up to 5 entries (albums or artists) shown as a single horizontal row/section in the view. Has a name, an order index, a selection rule (e.g., "top 5 played in 30 days"), and a visibility rule (hidden if empty).
- **Scrobble / Play Event**: A record that a track from an album was played by the user, with a timestamp. Used to compute "Recently Played" counts and "Hidden Gems" neglect.
- **User Rating**: A rating the user has given an album (e.g., 1–5 stars). Used to compute "Hidden Gems" candidates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a populated library can identify and start playing an album from the curated groups in under 10 seconds of opening the view (median across users in usability testing), and the Now Playing view appears as a direct consequence of that single play action with no extra clicks.
- **SC-002**: At least 80% of usability-test users correctly distinguish between the "play album" action (play button overlay) and the "open album details" action (card body) on first encounter, without instruction.
- **SC-003**: The albums view first meaningful paint occurs in under 2 seconds for a library of approximately 1,000 albums on a typical broadband connection.
- **SC-004**: The full alphabetical "Browse All Albums" view loads its first screen of content in under 2 seconds and scrolls smoothly (sustained 60 fps) on a library of at least 10,000 albums.
- **SC-005**: Empty groups are never visible to users — across 100 representative library snapshots (varied by listen history, ratings, and artist depth) the view renders only groups with at least one entry.
- **SC-006**: 100% of interactive elements on the view pass automated accessibility checks (keyboard reachable, named, contrasting focus indicator).
- **SC-007**: Album titles beginning with "The " sort correctly by the second word in the Browse All Albums view, verified against a fixture set covering at least 20 such titles.

## Assumptions

- The albums view is rendered inside the existing application shell (left navigation + main content area) and replaces the existing flat albums page as the canonical "Albums" destination (see FR-001a). The exact route URL (e.g., reuse the existing albums path vs. mount at a new path with a redirect) is left to planning, but the user-visible result is that there is only one albums entry in navigation and it is the new grouped view.
- The application already has a Now Playing view (the surface that displays the current track, queue, and playback controls). Starting an album from the albums view routes the user to that existing view; this feature does not redesign Now Playing, it only invokes it.
- "Listened to" / "scrobble" refers to the existing play-event tracking system already used for last.fm scrobbling and top-stats. No new event source is introduced by this feature.
- "Rating" refers to the user's album rating (e.g., 1–5 stars) sourced from the existing Plex-backed rating data. If per-track ratings are the only data available, an album's effective rating is the average of its rated tracks.
- The "neglect threshold" for Hidden Gems is **3 months** with no scrobbles (chosen during clarification — see Clarifications session 2026-05-19).
- "Release year" for ordering Artist Spotlight playback uses the album's stored original-release year if present, otherwise its release year, otherwise the added date. When all are missing, albums fall to the end of the queue in stable title order.
- Random Picks uses uniform random selection across the library, recomputed each time the view is opened (not per scroll). It is acceptable for the same album to appear in both Random Picks and another group on the same load.
- The "stacked albums" visual for Artist Spotlights is a layout decision — the spec only requires that the tile conveys "multiple albums" and shows the artist name. Detailed visual treatment is decided during planning/design.
- The view targets desktop, tablet, and mobile breakpoints; grid density adapts but every group's ordering rule remains identical.
- Cover art and album metadata are already available via the existing library indexing pipeline; no new data fetch from Plex is introduced by this feature beyond what is already in place.
- Localization/sorting uses the application's current locale (English defaults). The "The" article rule is English-specific and applies regardless of user locale because it is an explicit project requirement.
