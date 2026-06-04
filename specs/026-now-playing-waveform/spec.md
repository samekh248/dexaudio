# Feature Specification: Now Playing Waveform

**Feature Branch**: `026-now-playing-waveform`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "https://linear.app/audiodex/project/now-playing-waveform-e642e58eff28/overview — In the now playing page, the track progress bar should have the track waveform directly above it if the waveform information is available. The waveform should show a colored version for the portion of the track that has been played, and a muted color for the portion that has yet to be played."

## Clarifications

### Session 2026-06-04

- Q: Should the waveform support seek interaction or be display-only? → A: Click-to-seek only — a single click on the waveform jumps playback to that position; drag/scrub on the waveform itself is not supported (seeking by drag remains on the progress bar only).
- Q: While waveform data is loading, what should the user see? → A: Appear when ready — no waveform area until data is available; the progress bar layout stays unchanged.
- Q: How should assistive technologies treat the waveform? → A: Supplementary — the progress bar remains the primary accessible seek and position control; the waveform is supplementary imagery and current position continues to be conveyed via existing time labels and progress bar semantics.
- Q: How tall should the waveform display be on Now Playing? → A: Medium — moderate height (~56–72px), balanced readability without dominating the page layout.
- Q: Should hovering the waveform show feedback before click-to-seek? → A: Time on hover — hovering shows the target time at the pointer position (e.g., tooltip) before the user clicks to seek.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See playback progress on a waveform (Priority: P1)

A listener is on the Now Playing page while a track is playing. When waveform data exists for that track, they see a waveform visualization directly above the existing progress bar. The left portion of the waveform (up to the current playback position) appears in a full-strength accent color; the remainder appears in a subdued, muted color so they can see at a glance how far through the song they are.

**Why this priority**: This is the core product ask from the Linear project—visual progress tied to the track’s audio shape, not only a generic slider.

**Independent Test**: Play a track known to have waveform data, open Now Playing, and confirm a two-tone waveform sits above the progress bar and that the color boundary moves as playback advances.

**Acceptance Scenarios**:

1. **Given** a track is playing on the Now Playing page and waveform data is available for that track, **When** the playback controls area is shown, **Then** a waveform appears directly above the track progress bar.
2. **Given** the waveform is visible, **When** playback is at any position in the track, **Then** the portion from the start through the current position uses the accent (played) styling and the remainder uses muted (unplayed) styling.
3. **Given** the waveform is visible and playback is advancing, **When** time elapses without user interaction, **Then** the played/unplayed boundary updates in step with the current playback position shown on the progress bar.
4. **Given** waveform data is not available for the current track, **When** the Now Playing page is shown, **Then** no waveform is displayed and the progress bar behaves as it does today (no empty placeholder or error state for missing waveform).

---

### User Story 2 - Scrub and seek using the waveform (Priority: P2)

The listener wants to jump to a specific moment in the song. They click a point on the waveform to jump playback there (same seek enable/disable rules as the progress bar). Dragging on the waveform does not scrub; fine-grained scrubbing stays on the progress bar. After a click seek, the waveform played/unplayed split and the progress bar reflect the new position.

**Why this priority**: Click-to-seek gives quick jumps without duplicating the progress bar’s drag/scrub interaction.

**Independent Test**: With waveform visible, click a point on the waveform and confirm audio seeks; confirm drag on the waveform does not scrub (progress bar drag still works).

**Acceptance Scenarios**:

1. **Given** the waveform is visible and seeking is allowed for the current playback mode, **When** the user hovers over the waveform, **Then** the target time at the pointer position is shown (e.g., tooltip) without changing playback position.
2. **Given** the waveform is visible and seeking is allowed for the current playback mode, **When** the user clicks a position on the waveform, **Then** playback seeks to the corresponding time and the played/unplayed styling updates to match.
3. **Given** the waveform is visible and seeking is allowed, **When** the user drags across the waveform, **Then** playback does not scrub from that gesture alone (position changes only via progress bar drag or a discrete waveform click).
4. **Given** the user adjusts the existing progress bar, **When** the seek completes, **Then** the waveform played/unplayed boundary matches the new position.
5. **Given** seeking is not supported for the current playback session (e.g., remote player restrictions already reflected in the app), **When** the user hovers or clicks the waveform, **Then** no seek or hover-time preview is offered, consistent with the progress bar (no misleading interactive affordance).

---

### User Story 3 - Waveform across track and queue changes (Priority: P3)

The listener skips to another track or the queue advances. The waveform updates to match the new track when data exists, or disappears cleanly when it does not, without stale imagery from the previous song.

**Why this priority**: Correct lifecycle handling prevents confusion and support issues; it depends on P1 being in place.

**Independent Test**: Play track A with waveform, skip to track B without waveform, then to track C with waveform—confirm display swaps correctly each time.

**Acceptance Scenarios**:

1. **Given** a waveform is shown for track A, **When** the user skips to track B that has waveform data, **Then** the waveform redraws for track B and the played portion resets according to B’s playback position.
2. **Given** a waveform is shown for track A, **When** the user skips to track B without waveform data, **Then** the waveform is hidden and only the progress bar remains.
3. **Given** playback is paused, **When** the user views the Now Playing page, **Then** the waveform still reflects the paused position (played vs unplayed split does not advance until playback resumes).

---

### Edge Cases

- **Missing or late waveform data**: If data becomes available only after playback starts, the waveform appears when ready without resetting playback position; until then, no skeleton or reserved band is shown. If data never arrives, the page never reserves permanent empty space for it.
- **Very short or zero-duration tracks**: Progress and waveform boundaries stay aligned; no invalid seek targets are offered.
- **Restore / resume session**: When the app restores a saved position without auto-playing, the waveform played portion matches the restored position shown on the progress bar.
- **Loading and buffering**: While audio is loading or buffering, the waveform does not imply playback ahead of the actual position. While waveform *data* is still loading, nothing is shown in the waveform area (no skeleton); the progress bar remains fully usable.
- **Narrow viewports**: Waveform and progress bar remain readable and aligned in width without overlapping album art or queue content; waveform height stays within the medium target range (may scale down slightly on very narrow screens if needed for fit, but not below compact ~48px).
- **Reduced motion**: If the user prefers reduced motion, waveform updates may jump to position without decorative animation.
- **Assistive technology**: Screen reader and keyboard users rely on the progress bar and time labels for position and seeking; the waveform does not replace those semantics and is treated as supplementary decoration when present.
- **Hover on touch devices**: Pointer-hover time preview applies to pointer/hover contexts; touch users seek via click/tap without requiring a prior hover state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On the Now Playing page, the system MUST display a track waveform directly above the existing track progress bar when waveform data is available for the current track.
- **FR-002**: The system MUST NOT display a waveform when waveform data is unavailable; the progress bar and other controls MUST remain fully usable.
- **FR-003**: The waveform MUST visually distinguish played content (accent / full-strength color) from unplayed content (muted / subdued color) based on the current playback position.
- **FR-004**: The played/unplayed boundary MUST stay synchronized with the progress bar’s current position during playback, pause, and seek.
- **FR-005**: When the current track changes, the system MUST update or remove the waveform to match the new track’s availability and position.
- **FR-006**: When seeking is enabled for the current session, the user MUST be able to seek by clicking a position on the waveform; drag gestures on the waveform MUST NOT scrub playback. Seek enable/disable MUST match the progress bar exactly. When seeking is disabled, the waveform MUST be non-interactive (no click seek affordance).
- **FR-009**: While waveform data for the current track is loading, the system MUST NOT show a skeleton, placeholder band, or reserved empty waveform area; the waveform MUST appear only once data is ready.
- **FR-010**: The progress bar MUST remain the primary accessible control for seek position and elapsed time. The waveform MUST be exposed to assistive technologies as supplementary visual progress (not a second primary slider); click-to-seek on the waveform MUST not be the only path to adjust position for users who rely on keyboard or screen readers.
- **FR-007**: The waveform MUST share the same horizontal extent as the progress bar so position on the waveform corresponds to position on the bar.
- **FR-011**: The waveform MUST render at a medium visual height (approximately 56–72px) on the Now Playing page so it is readable without crowding adjacent content (album art, track info, queue).
- **FR-012**: When seeking is enabled and the user hovers over the waveform, the system MUST show the target time at the hover position without changing playback until click. Hover-time preview MUST be disabled when seeking is disabled.
- **FR-008**: The feature MUST apply only on the Now Playing page (not required in the header hover playback panel unless explicitly added in a future scope change).

### Key Entities

- **Waveform sample set**: Amplitude (or level) samples for a track over its timeline, used to draw the visualization; may be absent per track.
- **Playback position**: Current elapsed time in the active track, already driving the progress bar; drives the played/unplayed split on the waveform.
- **Current track**: The track metadata and identifiers for the item at the front of the active queue, used to request or resolve waveform data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For tracks with waveform data, 95% of listeners in a moderated test can identify how far through the track they are using only the waveform (without reading the time labels) within 3 seconds of viewing Now Playing.
- **SC-002**: During continuous playback, the played/unplayed boundary on the waveform stays within 1 second of the progress bar position for at least 99% of observed playback time in acceptance testing.
- **SC-003**: When waveform data is unavailable, 100% of tested tracks show no waveform and no layout shift compared to the pre-feature Now Playing layout after the track metadata has loaded.
- **SC-004**: After seeking via waveform click or progress bar adjustment, the waveform and bar positions match within 1 second in 100% of scripted seek scenarios during acceptance testing.
- **SC-005**: When switching tracks in a 10-track test queue, the waveform never shows the previous track’s shape for more than 1 second after the new track becomes current.

## Assumptions

- Waveform data is supplied by the connected music library when the server has analyzed or stored it; tracks without server-side waveform data are common and handled by hiding the visualization.
- The existing Now Playing progress bar, time labels, and transport controls remain; this feature adds context above the bar rather than replacing it.
- Accent and muted colors follow the listener’s active app theme so the waveform remains readable in light and dark appearances.
- The waveform supports click-to-seek only (not drag/scrub on the waveform); fine-grained scrubbing stays on the progress bar. Seek enable/disable mirrors the progress bar (including remote playback restrictions).
- Waveform data loading shows no interim placeholder; the visualization appears only when data is ready.
- For accessibility, the waveform is supplementary; the progress bar and time display remain the canonical position and seek affordances.
- Scope is limited to the Now Playing page per the Linear project description; header mini-player parity is out of scope for this feature.
