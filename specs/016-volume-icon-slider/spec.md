# Feature Specification: Volume Icon with Vertical Slider

**Feature Branch**: `016-volume-icon-slider`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "The volume control on the now playing page should be a sound icon that when clicked, will show a vertical slider bar to turn the volume up or down. Show the same thing in the now playing widget in the header."

## Clarifications

### Session 2026-05-30

- Q: Where should the header volume sound icon appear (always in header bar vs only in the playback panel)? → A: Only inside the open header playback panel, alongside previous / play-pause / next controls.
- Q: What happens to the open volume slider when the header playback panel closes? → A: Closing the panel also closes the volume slider if it was open.
- Q: When should the sound icon show a distinct muted/low visual state? → A: Distinct muted/off icon only at 0%; all levels above 0% use the standard sound-on icon.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adjust volume on the Now Playing page (Priority: P1)

A listener is on the Now Playing page and wants to change how loud the music is without a large control taking up permanent space on the screen. They tap or click a sound icon, a vertical slider appears, they drag to set the level they want, and playback volume updates immediately. When they are done, they dismiss the slider and only the compact sound icon remains visible.

**Why this priority**: The user explicitly called out the Now Playing page first; this is the primary surface for full playback control and delivers the new interaction pattern on its own.

**Independent Test**: Can be fully tested on the Now Playing page alone by opening the volume control from the sound icon, changing the slider, confirming audible volume change, and confirming the always-visible horizontal volume bar is no longer shown.

**Acceptance Scenarios**:

1. **Given** the user is on the Now Playing page with audio available, **When** the page is displayed, **Then** volume is represented by a sound icon (not a permanently visible horizontal slider).
2. **Given** the volume control is closed, **When** the user activates the sound icon, **Then** a vertical slider appears adjacent to or anchored on the icon for adjusting volume.
3. **Given** the vertical slider is open, **When** the user moves the slider toward the top end, **Then** playback volume increases and the change is audible during playback.
4. **Given** the vertical slider is open, **When** the user moves the slider toward the bottom end, **Then** playback volume decreases and the change is audible during playback.
5. **Given** the vertical slider is open, **When** the user dismisses the control (e.g., activates outside the control or activates the icon again per standard toggle behavior), **Then** the slider hides and only the sound icon remains.
6. **Given** the user sets a volume level on the Now Playing page, **When** they leave and return to the app in a later session, **Then** the last chosen volume level is restored.

---

### User Story 2 - Adjust volume from the header Now Playing widget (Priority: P2)

A listener is browsing another part of the app while music plays. They open the header Now Playing playback panel (hover, focus, or touch per existing behavior) and use the sound icon there—alongside previous, play/pause, and next—to open the vertical slider and change volume without navigating to the Now Playing page.

**Why this priority**: The user asked for parity in the header widget; it extends the same pattern to in-context listening but depends on the interaction model established in P1.

**Independent Test**: Can be tested from any page with a loaded track by using only the header Now Playing area: activate the sound icon, adjust the vertical slider, and confirm volume changes match what would occur on the Now Playing page.

**Acceptance Scenarios**:

1. **Given** a track is loaded and the header playback panel is open, **When** the panel is displayed, **Then** a sound icon for volume is visible alongside previous, play/pause, and next (matching the Now Playing page pattern).
2. **Given** the header playback panel is closed, **When** the user has not opened the panel, **Then** the header volume sound icon is not shown (volume is not adjustable from the header until the panel is open).
3. **Given** the header volume control is closed and the playback panel is open, **When** the user activates the sound icon, **Then** a vertical slider appears for adjusting volume.
4. **Given** the user adjusts volume via the header slider, **When** they navigate to the Now Playing page and open its volume control, **Then** both surfaces reflect the same current volume level.
5. **Given** the header playback panel is open, **When** the user adjusts volume via the vertical slider, **Then** the stored volume level is not reset by other playback actions in the panel.
6. **Given** the volume slider is open in the header panel, **When** the playback panel closes (pointer leave, blur, or touch release per existing behavior), **Then** the volume slider closes as well.

---

### User Story 3 - Understand volume state at a glance (Priority: P3)

A user wants quick feedback about whether sound is muted without opening the slider. The sound icon uses a distinguishable muted/off appearance only when volume is at zero; at any level above zero it shows the standard sound-on appearance.

**Why this priority**: Improves discoverability and accessibility of state but is not required for basic volume adjustment.

**Independent Test**: Can be tested by setting volume to zero and confirming the muted/off icon appears without opening the slider; raising volume above zero restores the standard sound-on icon.

**Acceptance Scenarios**:

1. **Given** volume is at zero, **When** the sound icon is visible on either surface, **Then** it shows a distinguishable muted/off appearance (not the standard sound-on icon).
2. **Given** volume is above zero at any level, **When** the sound icon is visible, **Then** it shows the standard sound-on appearance (no separate “low volume” icon variant).
3. **Given** the user changes volume using the slider, **When** the slider is open, **Then** the slider position matches the current volume level.

---

### Edge Cases

- **No active playback**: Volume icon may still be shown if volume preference applies globally; adjusting volume still updates the stored level and affects the next playback. If the product already hides playback controls when nothing is loaded, the volume icon follows the same visibility rules as other playback controls in that context.
- **Header panel closed**: The header volume icon is not available until the user opens the playback panel; volume changes from other pages require opening that panel or using the Now Playing page.
- **Header panel closes with slider open**: If the volume slider is open when the panel dismisses, the slider closes with the panel; volume level retains the last adjusted value.
- **Rapid open/close**: Repeatedly toggling the sound icon does not leave multiple sliders open or trap focus in a broken state.
- **Simultaneous surfaces**: If volume sliders are opened on both the Now Playing page and the header at once, both show the same level and changes on either surface update the shared volume immediately.
- **Keyboard and screen reader users**: The sound icon is focusable and activatable with keyboard; the vertical slider is operable without a pointer; opening and closing the control is announced or labeled in a way that identifies it as volume.
- **Touch and small screens**: The vertical slider has a large enough touch target to adjust volume without accidental dismissal; the control does not cause the header panel or Now Playing layout to reflow or jump when opened.
- **Extreme values**: Slider supports the full range from silent (0%) through maximum (100%) with smooth adjustment; at 0% playback is silent but the control remains usable to restore volume.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Now Playing page MUST expose volume through a sound icon instead of a permanently visible horizontal volume slider.
- **FR-002**: Activating the sound icon on the Now Playing page MUST reveal a vertical slider for adjusting volume up or down.
- **FR-003**: The header Now Playing playback panel MUST include the same sound icon and vertical slider volume control pattern as the Now Playing page, placed alongside previous, play/pause, and next when the panel is open.
- **FR-003a**: The header volume sound icon MUST NOT be shown when the playback panel is closed; users adjust header volume only while the panel is open (or via the Now Playing page).
- **FR-003b**: When the header playback panel closes, any open volume slider in that panel MUST close at the same time.
- **FR-004**: Volume adjustments from either surface MUST apply immediately to current playback and MUST use a single shared volume level across the application.
- **FR-005**: The system MUST persist the user’s volume preference across sessions and restore it on return.
- **FR-006**: The vertical volume slider MUST support the full usable range from silent through maximum loudness.
- **FR-007**: Users MUST be able to dismiss the vertical slider after use without leaving a persistent expanded control on screen.
- **FR-008**: The volume control MUST be usable with keyboard and assistive technologies (focusable trigger, labeled slider, logical open/close behavior).
- **FR-009**: Opening the volume slider MUST NOT shift or resize unrelated page content (consistent with existing non-reflowing overlay patterns in the header Now Playing widget).
- **FR-010**: When volume is at zero, the sound icon MUST show a distinguishable muted/off visual state; when volume is above zero, the icon MUST show the standard sound-on appearance (no separate low-volume icon variant).

### Key Entities

- **Volume preference**: The user’s chosen output level (0–100% or equivalent), shared app-wide, persisted between sessions, and driving both UI surfaces.
- **Volume control session**: Transient UI state while the vertical slider is open (which surface opened it, current drag position); does not store a separate volume from the preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated task testing, at least 90% of users can change volume on the Now Playing page within 10 seconds of first attempting, using only the sound icon and vertical slider.
- **SC-002**: In moderated task testing, at least 90% of users can change volume from the header Now Playing widget within 10 seconds without navigating away from their current page.
- **SC-003**: Volume set on one surface matches the level shown on the other surface within one interaction (no conflicting levels displayed).
- **SC-004**: After setting a non-default volume and fully closing the app, the restored volume matches the last setting in 100% of repeat visits in acceptance testing.
- **SC-005**: No layout shift of surrounding content is observed when opening or closing the volume slider on either surface during QA review of primary breakpoints.
- **SC-006**: Keyboard-only testers can open the slider, set volume, close the slider, and hear the volume change without using a pointer device.

## Assumptions

- A single application-wide volume applies to music playback; separate per-device or per-stream volume is out of scope unless already supported elsewhere.
- The existing persisted volume preference behavior remains; this feature changes presentation only, not the semantics of stored volume.
- The header “Now Playing widget” is the existing header playback panel (hover/focus/touch); the volume sound icon lives inside that panel next to previous / play-pause / next, not as a separate always-visible header control.
- Clicking the sound icon toggles the vertical slider open and closed; clicking outside the slider while open closes it (standard popover behavior).
- Vertical orientation means the top of the slider represents louder volume and the bottom represents quieter volume, matching common desktop media player conventions.
- Replacing the always-visible horizontal slider on the Now Playing page is in scope; no requirement to keep both horizontal and vertical controls.

## Dependencies

- Existing music playback and volume adjustment capability in the product.
- Existing header Now Playing playback controls surface (panel or equivalent) where an additional volume affordance can be placed without conflicting with previous/next/play controls.
