# Feature Specification: Queue Management

**Feature Branch**: `025-queue-management`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "https://linear.app/audiodex/project/queue-management-bbc62e47fec5/overview — Queue management project: distinguish played vs upcoming tracks in the queue UI; show per-track buffer readiness; support drag-and-drop reorder; prepare upcoming tracks aggressively for smooth playback, especially lossless formats."

## Clarifications

### Session 2026-06-03

- Q: When the user selects a track in the played/history section (jump backward), how should tracks that were already marked played but now sit after the new current position be treated? → A: Re-anchor — new selection becomes current; all earlier indices are played/history; all later indices are upcoming (tracks heard after the jump target may return to upcoming).
- Q: Can the user drag-reorder the currently playing track within the active/upcoming section? → A: No — only tracks strictly after the current index are draggable; the current row stays pinned.
- Q: How many upcoming tracks may be prepared in parallel during playback? → A: User-configurable queue preparation depth; default prepares three deep (immediate next track plus up to two successors).
- Q: Can users remove tracks from the upcoming section while listening? → A: Yes — upcoming and current rows keep a remove control; played/history rows do not.
- Q: For long sessions, how should the played/history section behave in the queue UI? → A: Auto-trim display — show at most the 3 most recent played tracks before the current index; older played tracks are not shown and are not selectable from the queue UI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what already played vs what is coming (Priority: P1)

As a listener reviewing my session, I want the queue to clearly separate tracks I have already heard from the track that is playing now and tracks still waiting, so I can understand my listening history at a glance without confusing past tracks with what will play next.

**Why this priority**: Without a clear played/upcoming split, the queue feels like one flat list and users cannot tell whether selecting a row will replay history or change what plays next.

**Independent Test**: Play through at least two tracks in a multi-item queue, open the queue panel, and verify a visible separator divides earlier tracks from the current and upcoming section; played rows look visually subdued compared to upcoming rows.

**Acceptance Scenarios**:

1. **Given** a queue with at least three tracks and playback has advanced past the first track, **When** the user opens the queue, **Then** at most the three tracks immediately before the current index appear above a separator in the played/history area (older passed tracks are omitted from the list), and the current track plus all later tracks appear below the separator.
2. **Given** playback is on the first track and no prior track has finished in this session, **When** the user opens the queue, **Then** no "played" section is shown (or it is empty) and all items appear in the active/upcoming area.
3. **Given** a track visible in the played section (one of the at most three shown before current), **When** the user selects it, **Then** the app switches playback context to that track, re-anchors the queue (that index becomes current, all earlier tracks remain played/history, all later tracks become upcoming even if they were played before the jump), and does not require rebuilding the queue.
4. **Given** a track in the played section, **When** the user attempts to remove it or change its order via queue editing controls, **Then** those edits are not offered (or are disabled) so played rows behave as a read-only history view while remaining selectable.
5. **Given** a track in the active/upcoming section (current or later), **When** the user uses remove, **Then** that track is removed from the queue using the same rules as today, and played/history rows never show remove.
6. **Given** the user skips forward without listening to a track to completion, **When** the queue updates, **Then** skipped tracks are grouped with played/history according to the same rules as tracks that finished naturally (they are not shown as upcoming).

---

### User Story 2 - Reorder what will play next (Priority: P1)

As a listener curating my session, I want to drag or touch-drag upcoming tracks (after the one that is playing) to change play order, so I can fix mistakes or prioritize songs without clearing and rebuilding the queue or interrupting the current song.

**Why this priority**: Reordering is a core queue-management action; the project explicitly requires pointer and touch drag affordances.

**Independent Test**: Add four tracks, start playback on the second, drag the fourth track to play next, and confirm playback order updates while the current track keeps playing and its row stays pinned.

**Acceptance Scenarios**:

1. **Given** a non-empty queue with at least two upcoming tracks, **When** the user drags an upcoming track to a new position among upcoming items, **Then** the queue order updates immediately and the next automatic advance follows the new order.
2. **Given** playback is in progress, **When** the user reorders tracks after the current one, **Then** the currently playing track continues without restart and its queue position does not change via drag.
3. **Given** the currently playing row, **When** the user attempts to drag it, **Then** reordering is not permitted (row pinned; no drag handle or drop rejected).
4. **Given** tracks in the played/history section, **When** the user attempts to drag them, **Then** reordering is not permitted (drag handle absent or drop target rejects the move).
5. **Given** a touch device, **When** the user press-holds an upcoming row and drags, **Then** reorder behaves the same as pointer drag with clear affordance that a drag is active.
6. **Given** a queue containing automatically added similar tracks mixed with user-added tracks, **When** the user reorders upcoming tracks, **Then** both types move together and retain their source distinction in the UI after reorder.

---

### User Story 3 - See upcoming tracks getting ready (Priority: P2)

As a listener about to hear the next song, I want to see how far along preparation is for upcoming tracks directly in the queue list, so I know whether the next transition will be smooth or still loading.

**Why this priority**: Visible buffer progress turns invisible background work into trustworthy feedback, especially before lossless transitions.

**Independent Test**: Start playback on a track with several queued successors on a typical home network; observe a thin progress indicator on the next upcoming row that advances as preparation completes and reaches full before or as that track becomes current.

**Acceptance Scenarios**:

1. **Given** a next track in the queue, **When** the system begins preparing that track for playback, **Then** the corresponding queue row shows a thin horizontal progress indicator along the row (or its primary content area) reflecting preparation progress from empty to complete.
2. **Given** preparation for the next track completes, **When** the user views the queue, **Then** the indicator shows a completed state until that track becomes current or preparation resets.
3. **Given** multiple upcoming tracks, **When** aggressive preparation runs for several successors, **Then** at minimum the immediately next track always shows buffer progress; additional upcoming rows may show progress when preparation has started for them.
4. **Given** preparation fails or is reset for a row, **When** the user views the queue, **Then** the indicator reflects not-ready or retry state without blocking interaction with other queue rows.
5. **Given** the user is on a small screen, **When** buffer progress is shown, **Then** the indicator remains visible but does not dominate the row (thin bar, does not obscure title and artist).

---

### User Story 4 - Smooth handoff between tracks (Priority: P2)

As a listener playing albums or lossless files, I want upcoming tracks to be prepared well ahead of time, so transitions between queue items rarely stall or gap even for large high-quality files.

**Why this priority**: The project calls for aggressive preparation, especially for lossless formats where startup latency is highest.

**Independent Test**: Queue several lossless tracks on a connection with moderate latency, play through consecutive items, and measure audible gap between track end and start of the next; compare to today’s behavior on the same device and network.

**Acceptance Scenarios**:

1. **Given** at least two tracks remain in the queue after the current one, **When** the current track is playing, **Then** the system begins preparing upcoming tracks before the current track ends, prioritizing the immediate next track first and then additional successors up to the user's configured preparation depth (default: three deep).
2. **Given** the next queued track uses a lossless format (e.g., FLAC or ALAC), **When** it is within three positions of playing, **Then** preparation starts earlier than for typical compressed tracks on the same device and network (see Assumptions for baseline).
3. **Given** aggressive preparation is underway, **When** the current track ends and the user has not skipped, **Then** the next track begins audible playback within 500 ms under typical home broadband on a desktop browser, or within 1.5 s on a mobile network profile defined in Assumptions.
4. **Given** the user skips to a distant track in the queue, **When** that track was not yet prepared, **Then** playback may show loading state but queue buffer indicators update to reflect new preparation targets without leaving stale progress on wrong rows.
5. **Given** limited device memory or bandwidth, **When** aggressive preparation must throttle, **Then** the immediate next track still receives highest priority and the user sees accurate buffer progress for that row.
6. **Given** the user changes queue preparation depth in settings, **When** playback continues, **Then** the system applies the new limit on the next preparation cycle without requiring a queue rebuild (default depth: three tracks including the immediate next).

---

### Edge Cases

- What happens when the queue has only one track? No separator for played history until that track finishes and more items are added; no reorder targets if alone (current row pinned with nothing after it).
- What happens when the user clears the queue during playback? Played/history section clears with the queue; buffer indicators disappear.
- What happens when the user removes the currently playing track? Removal follows existing playback behavior (e.g., advance to next or stop when empty); played/history updates on the next index change.
- What happens when the user jumps backward to a played track? The selected track becomes current; all tracks before it stay in played/history; all tracks after it become upcoming, including any that were previously in played/history after the jump target (re-anchor semantics).
- What happens when preparation cannot complete (offline, auth expired, track unavailable)? Buffer indicator stalls or shows failure; existing playback error handling applies when the track becomes current.
- What happens when the user rapidly reorders while preparation is in flight? Order and buffer indicators reconcile to the new next track within one second without showing progress on removed rows.
- What happens when auto-added similar tracks refill the queue during playback? New rows appear in the upcoming section; preparation and buffer UI treat them like other upcoming items.
- What happens after more than three tracks have played? Only the three immediately before the current index appear in played/history; older passed tracks are not listed and cannot be selected from the queue panel (queue order for advance logic is unchanged).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST divide the visible queue into a played/history region and an active/upcoming region whenever at least one track has finished or been skipped ahead of the current position in the current session.
- **FR-002**: The system MUST render a clear visual separator between played/history and active/upcoming regions.
- **FR-017**: The played/history region MUST display at most the three tracks immediately before the current index; older passed tracks MUST NOT appear in the queue UI.
- **FR-003**: Each track visible in the played/history region (up to three) MUST remain selectable to replay or resume context from that track; selecting one re-anchors the session so indices before the selection are played/history and indices after are upcoming.
- **FR-004**: Tracks in the played/history region MUST NOT be removable or reorderable through queue editing affordances (read-only management except selection); tracks at the current index and in the upcoming region MUST remain removable via the same remove control used today.
- **FR-005**: Tracks strictly after the current index in the active/upcoming region MUST be reorderable via pointer drag-and-drop and via touch press-hold drag on supported devices; the currently playing row MUST NOT be draggable.
- **FR-006**: Reordering MUST NOT move tracks from played/history into upcoming or vice versa, and MUST NOT change the current index or reorder the currently playing row; only positions after the current track may change order among eligible rows.
- **FR-007**: When the user reorders upcoming tracks, the system MUST persist the new order for subsequent automatic advance and manual next/previous actions in the same session.
- **FR-008**: The system MUST display a thin in-row progress indicator on the immediately next queued track while that track is being prepared for playback.
- **FR-009**: The system MAY display the same indicator on additional upcoming rows when preparation has started for those rows.
- **FR-010**: Buffer progress indicators MUST update when preparation advances, completes, fails, or is cancelled, and MUST clear or reset when the associated row is no longer the prepared target.
- **FR-011**: The system MUST prepare the next queued track before the current track ends whenever network and source access are available.
- **FR-012**: The system MUST prepare additional upcoming tracks beyond the immediate next when resources allow, up to a user-configurable maximum depth (default: three tracks total in the preparation window—immediate next plus up to two successors), with higher priority for tracks closer to playing.
- **FR-016**: The system MUST expose a user setting for queue preparation depth (minimum: next track only; default: three deep) and MUST apply the configured limit during aggressive preparation.
- **FR-013**: For lossless queued tracks near the front of the queue, the system MUST start preparation sooner than for standard compressed tracks under the same conditions.
- **FR-014**: After a skip or jump to a new queue index, preparation and buffer indicators MUST retarget to the new next track within one second.
- **FR-015**: Queue management behaviors in this feature MUST apply wherever the full queue list is shown during playback (e.g., dedicated now-playing queue view); compact queue summaries MUST at minimum reflect current vs upcoming distinction if they list multiple tracks.

### Key Entities

- **Queue session**: The ordered list of tracks for the current listening session, including which index is current, which indices are considered played/history, and which are upcoming.
- **Queue row**: A single track entry with source type (user-added vs auto-added), visual state (played, current, upcoming), and optional preparation progress.
- **Preparation state**: Per-track readiness for playback (not started, in progress, complete, failed) driving buffer indicators and handoff timing.
- **Queue preparation depth setting**: User preference controlling how many upcoming tracks (including the immediate next) may be prepared in parallel; default three deep.
- **Played/history boundary**: The index immediately before the current track; it moves when the user advances, skips, or re-anchors by selecting a visible played track (later indices may leave played/history and return to upcoming under re-anchor).
- **Played display window**: The at-most-three queue rows shown in played/history immediately before the current index; older passed tracks are outside this window and hidden from the queue list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated usability checks, at least 90% of participants correctly identify which visible queue rows already played versus which will play next without coaching (played window of up to three tracks).
- **SC-002**: Users can reorder an upcoming track to a new position in under 5 seconds on desktop and under 8 seconds on touch devices in a five-item queue test scenario.
- **SC-003**: For a test playlist of three consecutive lossless tracks on a defined home broadband profile, at least 95% of track-to-track transitions start audible playback within 500 ms of the previous track ending when the user does not skip.
- **SC-004**: On the defined mobile network profile, at least 90% of consecutive transitions to the pre-queued next track start within 1.5 s without user intervention.
- **SC-005**: The buffer indicator for the next track reaches a completed state before that track becomes current in at least 90% of non-skip transitions during the same lossless test playlist.
- **SC-006**: Support requests or internal bug reports citing "queue confusing / don’t know what played" decrease by 50% within one release cycle after launch (baseline: reports in the month before release).

## Assumptions

- Queue persistence across app reload is handled by an existing capability; this feature focuses on in-session queue presentation, reorder, and preparation UX unless a gap is discovered during planning.
- "Played" includes tracks the user finished hearing and tracks passed by skip/next before natural end, consistent with current session index semantics.
- Read-only played rows still allow selection to jump playback; they do not allow delete or drag.
- The current track is always shown in the active/upcoming section (not in played/history) while it is playing.
- Backward selection re-anchors played vs upcoming boundaries; played/history is not monotonic across the whole session.
- Played/history in the queue UI shows a fixed maximum of three tracks before the current index; trimming is display-only and does not remove items from the underlying queue order.
- Lossless formats mean user-visible lossless quality (e.g., FLAC, ALAC); preparation priority also benefits other large files but lossless receives the earliest start offset.
- "Typical home broadband" means wired or Wi-Fi at ≥25 Mbps download in test plans; "mobile network profile" means throttled 4G (~5 Mbps down, ~50 ms RTT) for repeatable QA.
- Aggressive preparation respects existing music source and account limits; throttling under resource pressure never blocks playback of the current track.
- Queue preparation depth is configurable in playback or queue-related settings; out of the box the limit is three tracks (next plus two successors). Planning may align this with existing playback preference storage.
- Auto-added similar tracks remain in scope for reorder and buffer display like user-added items.
- Compact player chrome that does not show the full list is out of scope except for any minimal current-vs-next labeling called out in FR-015.

## Dependencies

- Existing playback queue ordering, current index, skip, and auto-queue behaviors.
- Existing track preparation or staging behavior used for gapless or next-track handoff (to be extended, not replaced, during implementation planning).
- Existing distinction between user-added and auto-added queue entries for labeling after reorder.
- Existing playback or settings UI patterns for user preferences (for the preparation depth control).
