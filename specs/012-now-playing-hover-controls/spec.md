# Feature Specification: Now Playing Hover Controls

**Feature Branch**: `012-now-playing-hover-controls`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "When hovering over the Now Playing button, I want it to have playback controls show up underneath it without reflowing the screen. The playback controls should include previous, play/pause, next. Each should be represented by an icon and only show the associated text when hovering over the icon. Above the controls should be a marquee that includes artist name - track name."

## Clarifications

### Session 2026-05-29

- Q: How does a keyboard-only or touch user open the control panel (since hover is pointer-only)? → A: Panel opens on pointer hover, on keyboard focus of the Now Playing button, and on touch press-and-hold; it closes on blur / pointer-leave / touch release away.
- Q: When the marquee text overflows, what scroll style should it use? → A: Continuous looping horizontal scroll while the panel is open (wraps around repeatedly).
- Q: What should happen when there is no active/loaded track and the user tries to open the panel? → A: Do not show the panel at all when there is no active track.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick playback control from anywhere (Priority: P1)

A listener is browsing their library (or any page in the app) while music is playing. They move their pointer over the "Now Playing" button in the header and a small panel appears directly beneath it, giving them previous, play/pause, and next controls without leaving the current page or having to navigate to the Now Playing page. They click play/pause to pause the music, then move the pointer away and the panel disappears.

**Why this priority**: This is the core value of the feature — letting users control playback in-context without navigating away or disrupting their current view. Without it, the feature delivers nothing.

**Independent Test**: Can be fully tested by hovering over the Now Playing button while a track is loaded and confirming a control panel appears beneath the button with working previous, play/pause, and next actions, and that the rest of the page does not move or resize.

**Acceptance Scenarios**:

1. **Given** a track is loaded and the Now Playing button is visible, **When** the user moves the pointer over the Now Playing button, **Then** a control panel appears directly beneath the button.
2. **Given** the control panel is visible and audio is playing, **When** the user activates the play/pause control, **Then** playback pauses and the control reflects the paused state.
3. **Given** the control panel is visible and audio is paused, **When** the user activates the play/pause control, **Then** playback resumes and the control reflects the playing state.
4. **Given** the control panel is visible, **When** the user activates the next control, **Then** playback advances to the next track in the queue.
5. **Given** the control panel is visible, **When** the user activates the previous control, **Then** playback returns to the previous track (or restarts the current track per existing behavior).
6. **Given** the control panel is visible, **When** the user moves the pointer away from both the button and the panel, **Then** the panel disappears.
7. **Given** the control panel appears or disappears, **When** the panel's visibility changes, **Then** no other on-screen content shifts position or changes size.

---

### User Story 2 - See what is currently playing (Priority: P2)

While the control panel is open, the user wants to confirm what they are about to control. Above the playback controls, a marquee displays the current "artist name - track name". When the text is too long to fit, it scrolls horizontally so the full information can be read.

**Why this priority**: It reinforces the context of the controls and lets users confirm the active track, but the controls themselves are usable without it. It builds on P1.

**Independent Test**: Can be tested by opening the control panel and confirming that the marquee shows the current track's "artist - track" text, and that long values animate/scroll rather than truncating or wrapping.

**Acceptance Scenarios**:

1. **Given** a track is loaded and the control panel is open, **When** the panel is displayed, **Then** a marquee above the controls shows "{artist name} - {track name}" for the current track.
2. **Given** the artist/track text is longer than the available width, **When** the panel is open, **Then** the text scrolls horizontally so the entire text can be read over time.
3. **Given** the artist/track text fits within the available width, **When** the panel is open, **Then** the text is displayed without unnecessary scrolling.
4. **Given** the current track changes while the panel is open, **When** the new track becomes active, **Then** the marquee updates to the new "{artist name} - {track name}".

---

### User Story 3 - Discover what each control does (Priority: P3)

A user who is unsure what an icon means hovers over an individual control icon (previous, play/pause, or next). Only then does the associated text label for that control appear. With the pointer not over any icon, the controls display as icons only.

**Why this priority**: This is a usability/discoverability enhancement layered on top of the working icon controls. The controls function without the per-icon labels, so this is the lowest priority.

**Independent Test**: Can be tested by opening the panel, confirming each control shows only an icon by default, and confirming that hovering an individual icon reveals only that icon's text label.

**Acceptance Scenarios**:

1. **Given** the control panel is open and the pointer is not over any control icon, **When** the panel is displayed, **Then** each control shows only its icon with no visible text label.
2. **Given** the control panel is open, **When** the user hovers over a specific control icon, **Then** that control's text label becomes visible.
3. **Given** a control icon's label is visible, **When** the user moves the pointer off that icon, **Then** the label is hidden again.
4. **Given** the user hovers over one control icon, **When** the label appears, **Then** labels for the other control icons remain hidden.

---

### Edge Cases

- **No active track**: When nothing is loaded/queued, hovering/focusing/pressing the Now Playing button does not open the panel at all; the button retains only its existing navigation behavior.
- **Pointer transition gap**: Moving the pointer from the button to the panel beneath it should not cause the panel to flicker or close prematurely.
- **First/last track in queue**: Previous on the first track and next on the last track should follow existing playback behavior (e.g., previous restarts the current track; next does nothing or ends gracefully when no further track exists).
- **Long marquee text**: Very long artist/track combinations must scroll smoothly without breaking layout or overflowing the panel.
- **Missing metadata**: If artist or track name is missing, the marquee shows the available portion gracefully without showing a stray separator.
- **Touch / no-hover devices**: On devices without a hover capability, the panel must open via press-and-hold on the Now Playing button; the existing Now Playing page also remains available as a fallback. A normal tap must still navigate to the Now Playing page.
- **Rapid state changes**: Pausing/resuming or skipping repeatedly should keep the play/pause control's state in sync with actual playback.
- **Reduced-motion preference**: Users who prefer reduced motion should not be subjected to continuous marquee scrolling animation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a playback control panel directly beneath the "Now Playing" button when the user hovers over that button.
- **FR-002**: The control panel MUST appear as an overlay so that its appearance and disappearance do NOT reflow, shift, or resize any other on-screen content.
- **FR-003**: The control panel MUST include three controls: previous, play/pause, and next.
- **FR-004**: Each control MUST be represented by an icon by default, with no text label visible until that specific icon is hovered.
- **FR-005**: When the user hovers over an individual control icon, the system MUST reveal only that control's associated text label.
- **FR-006**: The play/pause control MUST toggle playback and visually reflect the current playing/paused state.
- **FR-007**: The next control MUST advance playback to the next track consistent with existing queue behavior.
- **FR-008**: The previous control MUST move playback to the previous track consistent with existing queue behavior (including restarting the current track when appropriate).
- **FR-009**: The system MUST display a marquee above the controls showing the current track's "{artist name} - {track name}".
- **FR-010**: The marquee MUST scroll horizontally in a continuous loop (wrapping around repeatedly) while the panel is open when its text exceeds the available width, and present text statically when it fits.
- **FR-011**: The marquee MUST update whenever the currently playing/active track changes.
- **FR-012**: The control panel MUST remain visible while the pointer is over either the Now Playing button or the panel itself, and MUST hide when the pointer leaves both.
- **FR-012a**: The control panel MUST also open when the Now Playing button receives keyboard focus and remain open while focus stays within the button or panel, hiding when focus leaves both.
- **FR-012b**: On touch devices, the control panel MUST open when the user presses and holds the Now Playing button, and MUST hide when the touch is released away from the panel/button.
- **FR-013**: The system MUST keep the existing Now Playing button behavior (navigation to the Now Playing page on activation) intact alongside the new hover panel.
- **FR-014**: When there is no active/loaded track, the system MUST NOT open the control panel at all (no controls and no marquee are shown).
- **FR-015**: All controls MUST be operable and labeled in an accessible manner (keyboard-focusable and exposing the control names to assistive technology), and continuous marquee animation MUST respect a user's reduced-motion preference.

### Key Entities *(include if feature involves data)*

- **Current Track**: The track currently active in the playback queue. Relevant attributes for this feature: artist name, track name, and playing/paused state. Used to populate the marquee and the play/pause control state.
- **Playback Controls**: The logical set of available actions (previous, play/pause, next) surfaced in the hover panel, mapped to existing playback queue actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any page where the Now Playing button is visible, a user can pause or resume playback in a single hover-and-click interaction without navigating away from their current page.
- **SC-002**: Showing or hiding the control panel causes zero pixels of layout movement in surrounding content (no reflow) in 100% of cases.
- **SC-003**: A user can identify what each control does within 2 seconds by hovering, with the correct label appearing for only the hovered icon.
- **SC-004**: For tracks whose "artist - track" text exceeds the panel width, 100% of the text becomes readable via marquee scrolling within one scroll cycle.
- **SC-005**: The play/pause control's displayed state matches actual playback state in 100% of observed interactions, including rapid toggling.
- **SC-006**: Users can reach previous, play/pause, and next controls via keyboard and assistive technology with correctly announced control names.

## Assumptions

- The "Now Playing" button referenced is the existing header navigation button that links to the Now Playing page; the new hover panel augments rather than replaces it.
- "Track name" maps to the current track's title and "artist name" maps to the current track's artist as already modeled in the playback queue.
- Previous/next/play-pause map to the application's existing playback queue actions and preserve their current edge behaviors (e.g., previous restarting the current track at the start of the queue).
- "Marquee" means horizontally scrolling text only when content overflows; static display is acceptable when content fits.
- The feature supports pointer hover, keyboard focus, and touch press-and-hold to open the panel; the existing Now Playing page remains an additional fallback control surface.
- This feature is presentation/interaction only and does not introduce new persisted data or backend changes.
