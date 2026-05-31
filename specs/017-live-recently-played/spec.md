# Feature Specification: Live Recently Played Updates

**Feature Branch**: `017-live-recently-played`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "The recently played group on the library page should update on every song play. Plex needs to provide this info, so it should also appropriately report to Plex"

## Clarifications

### Session 2026-05-30

- Q: When should Recently Played refresh relative to which screen the user is viewing? → A: Refetch on every play app-wide, even when the user is on another screen (background refresh always).
- Q: Should resume after pause trigger a Recently Played refresh? → A: Never refresh on resume; only refresh when a different album’s track starts.
- Q: How should rapid album skips be handled for Recently Played refresh? → A: Debounce until the current track has played for at least 5 seconds on the new album before triggering refresh.
- Q: What should the Recently Played row show while an update is in progress? → A: Keep current cards visible; show a subtle row-level loading indicator only while fetching (after the 5-second threshold).
- Q: What happens to an in-flight Recently Played fetch when the active album changes? → A: Cancel in-flight fetch on album change; restart the 5-second dwell for the new album.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recently Played reflects my current listening session (Priority: P1)

As a listener browsing my library, I want the **Recently Played** group on the library home to update whenever I play a song, so that the row always reflects what I am actually listening to now—not a stale snapshot from when I first opened the page.

**Why this priority**: Recently Played is the first curated row on the library home and is meant to surface music the user is actively engaging with. If it only updates on page load, it misleads the user about their listening habits and undermines trust in the rest of the curated groups.

**Independent Test**: Open the library home, note the current Recently Played order, play a track from an album not in the top row (or from an album ranked lower in the row), then return to or remain on the library home. Within a short interval, the played album appears in Recently Played with ranking consistent with a new play in the trailing 30-day window.

**Acceptance Scenarios**:

1. **Given** the user is on the library home and starts playback of a Plex-sourced track from a new album, **When** the track has played audibly for at least 5 seconds, **Then** the Recently Played group updates to reflect that album within 15 seconds of that threshold without requiring a manual page refresh.
2. **Given** the user plays a track from a new album while on another view (e.g., Now Playing or album detail), **When** the track reaches 5 seconds of audible playback, **Then** a background refresh of Recently Played is triggered (without waiting for navigation), and **When** they navigate back to the library home after that threshold, **Then** the row reflects the play or finishes updating within 15 seconds of the refresh trigger.
3. **Given** the user skips to another track on the **same album** already in Recently Played, **When** playback begins, **Then** Recently Played does **not** refresh (resume and same-album track changes do not trigger refresh); accumulated play activity for that album appears the next time a **different** album’s track starts and triggers a refresh.
4. **Given** the user skips through several tracks in quick succession across **different albums**, **When** a track on a new album is skipped before 5 seconds of audible playback, **Then** Recently Played does not refresh for that brief album; **When** the user settles on an album for at least 5 seconds, **Then** Recently Played refreshes once for that settled album within 15 seconds of the threshold.
5. **Given** the user opens **View all** for Recently Played, **When** they have played new music since the home row last loaded, **Then** the full list (top 20 by 30-day play count) includes the same play activity shown on the home row, ordered by the same rules.

---

### User Story 2 - Plex is the source of truth for play activity (Priority: P1)

As a listener who uses Plex as my music library, I want every song I play through this app to be reported to Plex before Recently Played updates, so that the group shows the same play history Plex would show to any other client—not a local-only guess that diverges from my server.

**Why this priority**: Recently Played ranking depends on Plex’s 30-day play counts and last-played timestamps. Without accurate Plex reporting, refreshing the group would still show stale or wrong data. Reporting and UI refresh are two sides of the same user expectation.

**Independent Test**: Play a track for at least 30 seconds with Plex reporting enabled. Confirm Plex’s own recently played or activity view shows the track, then confirm the library home Recently Played group includes the album within the update window.

**Acceptance Scenarios**:

1. **Given** the user plays a Plex-sourced track with reporting enabled, **When** Recently Played refreshes after the play, **Then** the updated row is consistent with Plex’s play activity for that user (same album eligibility and ordering rules as defined for the albums library view).
2. **Given** a play session is reported to Plex (start and progress per the Plex playback reporting feature), **When** the Recently Played data is fetched, **Then** the fetch occurs after reporting has been sent for that play—not only on a fixed timer unrelated to playback events.
3. **Given** the user plays from a locally cached copy of a Plex track, **When** Recently Played updates, **Then** the album is ranked using the same Plex-reported play activity as a stream-direct play.
4. **Given** reporting to Plex fails temporarily, **When** the user continues listening, **Then** Recently Played may lag until reporting succeeds and Plex reflects the play; the user is not shown a optimistic ranking that Plex would contradict once sync completes.

---

### User Story 3 - Updates do not disrupt browsing (Priority: P2)

As a user scrolling or interacting with other library groups, I want Recently Played to update smoothly when a play occurs, so that I am not kicked out of what I am doing or forced to wait for unrelated groups to reload.

**Why this priority**: Live updates must feel helpful, not disruptive. Other groups (Recently Added, Hidden Gems, etc.) do not need to reload on every play; only Recently Played depends on play activity.

**Independent Test**: While scrolled to a lower group on the library home, play a song from Now Playing. Recently Played updates in place; scroll position and other group content remain stable.

**Acceptance Scenarios**:

1. **Given** the user is viewing the library home with multiple groups loaded, **When** a play triggers a Recently Played refresh, **Then** only the Recently Played row (and its **View all** data when opened) is updated—other groups are not refetched solely because of the play.
2. **Given** the Recently Played row is mid-update, **When** new album cards arrive, **Then** the row keeps showing the previous cards until the fetch completes, displays a subtle row-level loading indicator only during the fetch (after the 5-second threshold), and does not collapse, flash empty, or reorder unrelated groups on the page.
3. **Given** the user has the Recently Played **View all** page open, **When** they play a new album elsewhere for at least 5 seconds, **Then** that page’s list updates within the same time window as the home row without losing sort order rules; **When** they change album during an in-flight fetch, **Then** the stale fetch is cancelled and the dwell restarts for the new album.

---

### Edge Cases

- What happens when the played album was not previously in the top 10 home preview? It enters the row if it now qualifies among the top 10 by 30-day play count; the lowest-ranked preview item may drop off.
- What happens when the user resumes playback after pause? Recently Played does not refresh; Plex may still receive resume reporting per the playback reporting feature, but the row waits until a different album’s track plays for at least 5 seconds.
- What happens when the user skips to another track on the same album? No Recently Played refresh until a different album’s track starts and plays for at least 5 seconds; then the refresh reflects all Plex-recorded activity since the last refresh.
- What happens when the user skips to a new album but skips away again before 5 seconds? No Recently Played refresh for that album; Plex may still receive playback reports per the reporting feature.
- What happens when Plex reporting is disabled in Settings? Recently Played continues to reflect Plex’s last known state; new plays in this app do not appear until reporting is re-enabled and Plex records them.
- What happens when the user switches Plex server or library mid-session? Recently Played clears or reloads for the new library context; plays on the previous server do not appear on the new library’s row.
- What happens on first visit with no play history? Recently Played remains hidden (empty group) until at least one qualifying play exists in the 30-day window.
- What happens when two browser tabs both play? Each tab’s library view updates based on shared Plex state; coordinating duplicate reporting is out of scope (consistent with existing playback reporting behavior).
- What happens when the user changes album while a Recently Played fetch is in progress? The in-flight fetch is cancelled, the loading indicator clears, and the 5-second dwell restarts for the new album; no stale results from the prior album are applied.
- What happens during gapless or crossfade transitions? The audibly dominant track’s album starts a new 5-second dwell; any in-flight fetch for the prior album is cancelled per the album-change rule.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a Plex-sourced track from an album **different from the album currently playing** has played audibly for at least **5 seconds**, the system MUST trigger a background refresh of Recently Played data and complete the update within **15 seconds** of that threshold, regardless of which screen the user is currently viewing.
- **FR-001a**: Resume after pause and track changes within the **same album** MUST NOT trigger a Recently Played refresh.
- **FR-001b**: Album changes where the user skips away before **5 seconds** of audible playback on the new album MUST NOT trigger a Recently Played refresh.
- **FR-001c**: When the active album changes (including during an in-flight fetch), the system MUST cancel any pending Recently Played fetch, clear any row-level loading indicator, and restart the 5-second dwell for the new album.
- **FR-002**: Recently Played on the library home MUST continue to use the existing selection rules: top 10 albums by play count in the trailing 30 days, tie-break by most recent play, empty group hidden when no qualifying albums exist.
- **FR-003**: The Recently Played **View all** list MUST stay consistent with the home row’s data source and ordering rules (top 20, same eligibility) and MUST refresh on the same 5-second album-change threshold and 15-second completion window as the home row.
- **FR-004**: Before or as part of refreshing Recently Played after an album-change play, the system MUST report that play to Plex when the track is Plex-sourced and reporting is enabled, so refreshed data reflects Plex’s play activity (including any same-album listens since the last refresh).
- **FR-005**: Playback reporting for Recently Played updates MUST follow the same scope and lifecycle rules as the Plex playback reporting feature (Plex-sourced content only, no reports when disconnected or reporting disabled).
- **FR-006**: Refreshing Recently Played after a play MUST NOT trigger a full reload of all other library home groups solely because of the play event.
- **FR-006a**: During a Recently Played fetch triggered after the 5-second threshold, the row MUST retain the previous album cards and MAY show a subtle row-level loading indicator; it MUST NOT show a skeleton, empty state, or full-row replacement until new data is ready.
- **FR-007**: When the user navigates to the library home after playing a new album elsewhere for at least 5 seconds, the system MUST show Recently Played that reflects that play (already updated or finishing within 15 seconds of the refresh trigger).
- **FR-008**: If Plex has not yet reflected a play after reporting (e.g., brief server lag), the system MAY retry the Recently Played refresh within the 15-second window rather than showing stale data indefinitely for that session.
- **FR-009**: Recently Played updates MUST NOT block or interrupt audio playback.
- **FR-010**: When reporting is disabled, the system MUST NOT fabricate local-only Recently Played rankings; the row reflects whatever Plex last exposes for the 30-day window.

### Key Entities

- **Recently Played group**: A curated library home row (preview up to 10 albums) and optional **View all** list (up to 20 albums), ranked by 30-day play count from Plex with tie-break by last played time.
- **Recently Played refresh trigger**: A Plex-sourced track from an album different from the album currently playing, after **5 continuous seconds** of audible playback on that new album. Does **not** include resume after pause, same-album track changes, or album changes skipped before the 5-second threshold. A new album change cancels any in-flight fetch and restarts the dwell clock.
- **Plex play activity**: Server-side play counts and last-played timestamps for the trailing 30 days, updated when this app reports playback to Plex.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In manual testing with reporting enabled and a healthy Plex connection, 95% of album-change sessions where the new album plays for at least 5 seconds update the library home Recently Played row within 15 seconds after that 5-second threshold.
- **SC-002**: In 95% of trials, the album shown in Recently Played after an update matches the album of the track the user actually played (not a prior or queued-only selection).
- **SC-003**: When comparing home row and **View all** after the same play, 100% of acceptance tests show consistent ordering rules and inclusion of the played album when it qualifies in the top 20.
- **SC-004**: In 95% of trials, playing a song does not cause non–Recently Played library groups to visibly reload or flicker.
- **SC-005**: With reporting disabled, zero manual tests show a new in-app play appearing in Recently Played until reporting is re-enabled and Plex records the session.
- **SC-006**: After returning to the library home at least 5 seconds into playback of a new album on another screen, users see the updated Recently Played row in 90% of trials without manually refreshing the browser.

## Assumptions

- Recently Played ranking and limits follow the albums library view and library view refactor specifications (30-day window, top 10 preview, top 20 **View all**, same tie-break rules).
- Plex is the authoritative source for play counts and last-played times; this feature does not maintain a separate long-lived play-history store for ranking.
- Accurate Plex playback reporting (report start, progress, pause, resume, stop for Plex-sourced tracks) is required for Recently Played to stay correct; that behavior is specified in the Plex playback reporting feature and is a dependency, not redefined here.
- “Every song play” in the user request maps to Plex reporting on each track start (per the playback reporting feature); **Recently Played UI refresh** is narrower—only when a **different album’s** track begins, not on resume or same-album track changes.
- Default expectation is reporting enabled; users who disable reporting accept that Recently Played will not reflect new listening in this app until they re-enable it.
- Brief Plex server lag (a few seconds) between report and query is acceptable; bounded retry within the update window is sufficient.
- Plex playback reporting (per feature 015) continues on each track start; the **5-second dwell** applies only to Recently Played **UI refresh**, not to outbound Plex reports.
- Background refresh after the 5-second album-change threshold (even when library views are not visible) is intentional; same-album listens, resumes, and skips before 5 seconds do not add refresh load.
- Hidden Gems and other groups that use last-played or play-count fields may eventually benefit from the same reporting pipeline but are out of scope for automatic refresh on every play in this feature.
