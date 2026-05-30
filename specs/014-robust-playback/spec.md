# Feature Specification: Robust, Reliable Music Playback

**Feature Branch**: `014-robust-playback`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "The music playback is unreliable. Refactor the playback to be robust, high performant, and reliable."

## Clarifications

### Session 2026-05-30

- Q: On a final (unrecoverable) track failure, should the player auto-advance or stop? → A: Auto-advance to the next playable track with a brief non-blocking notice; stop only when the queue is exhausted.
- Q: Should crossfade be fully implemented, simplified, or kept as-is? → A: Fully implement crossfade with overlapping outgoing/incoming audio and a configurable fade, applied consistently on natural ends and manual skips.
- Q: Should reliable seeking be guaranteed on live streams too, or only cached tracks? → A: Reliable on all sources, including live streams, via end-to-end byte-range support in the streaming proxy (backend changes in scope).
- Q: What is the auto-recovery policy (retries and stall window)? → A: Balanced — up to 3 retries with brief backoff, and up to ~10 seconds of buffering/stall before declaring final failure.
- Q: What is the "previous" button behavior rule? → A: If more than ~3 seconds have elapsed, restart the current track; otherwise go to the previous track.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Playback starts and keeps playing reliably (Priority: P1)

A listener selects a track (or album/playlist) and presses play. The audio begins promptly and plays to completion without unexpected silence, stalls, or sudden stops. When a momentary network hiccup or source error occurs, the system recovers on its own and continues playing rather than leaving the listener with dead air.

**Why this priority**: This is the core promise of a music player. If pressing play does not reliably produce continuous audio, every other feature is undermined. It is the single largest source of the reported unreliability.

**Independent Test**: Play a track from a fresh session and confirm audio starts within the target time and plays to the end. Simulate a transient stream interruption mid-track and confirm playback resumes automatically without user action.

**Acceptance Scenarios**:

1. **Given** a track is selected, **When** the listener presses play, **Then** audio begins within the target start time and continues uninterrupted to the natural end of the track.
2. **Given** a track is playing, **When** the network briefly drops or the stream stalls, **Then** the system pauses to buffer and automatically resumes from the same position without losing the listener's place.
3. **Given** a track fails to load or play after automatic recovery attempts are exhausted, **When** the failure is final, **Then** the listener sees a brief non-blocking notice and the player auto-advances to the next playable track (stopping only when the queue is exhausted) without freezing.
4. **Given** the browser blocks audio from starting automatically, **When** the listener interacts to resume, **Then** playback starts from the intended position on the first attempt.

---

### User Story 2 - Smooth, correct track transitions (Priority: P2)

A listener moves between tracks—by letting a track end naturally, pressing next/previous, or selecting a different track—and the transition is smooth and lands on exactly the intended track. There are no double-skips, no tracks silently swallowed, no audible glitches, and the displayed track always matches the audio being heard.

**Why this priority**: Incorrect or jarring transitions are a frequent, visible reliability problem. Once playback itself is stable (P1), correct and smooth transitions are the next most impactful improvement to perceived quality.

**Independent Test**: Build a queue, then let tracks end naturally and use next/previous rapidly; confirm the playing audio, queue position, and now-playing display stay in agreement and no track is skipped or repeated unintentionally.

**Acceptance Scenarios**:

1. **Given** a track reaches its natural end, **When** the next track exists in the queue, **Then** the next track begins and the now-playing display and queue position update to match the audio exactly once (no double-advance).
2. **Given** the listener rapidly presses next several times, **When** the presses are faster than tracks can load, **Then** the player ends on the correct final track and plays it, discarding the intermediate loads cleanly.
3. **Given** the listener presses previous, **When** more than ~3 seconds have elapsed in the current track, **Then** the current track restarts from the beginning; **and when** 3 seconds or less have elapsed, **Then** the player goes to the previous track—applied consistently.
4. **Given** the configured transition style (none, gapless, or crossfade), **When** a transition occurs, **Then** the behavior matches the selected style consistently across both natural ends and manual skips.
5. **Given** the listener changes the transition style in settings, **When** the next transition occurs, **Then** the new style takes effect without requiring a reload or restart of the app.

---

### User Story 3 - Responsive controls and seeking during loading (Priority: P3)

A listener interacts with the player—pausing, resuming, adjusting volume, and seeking within a track—and the controls respond promptly and accurately, even while audio is still buffering or loading. Seeking lands at the requested position and resumes playing reliably.

**Why this priority**: Once audio is stable and transitions are correct, control responsiveness and accurate seeking are the remaining quality gaps that make playback feel solid rather than fragile.

**Independent Test**: While a track is buffering and while it is playing, exercise pause/resume, volume, and seek to multiple positions; confirm each control responds quickly and the resulting audio state matches the requested action.

**Acceptance Scenarios**:

1. **Given** a track is still loading, **When** the listener presses pause then play, **Then** the control state stays consistent and audio reflects the final requested state once loaded.
2. **Given** a track is playing, **When** the listener seeks to a new position, **Then** audio resumes from that position promptly and the displayed position matches the audio.
3. **Given** the listener seeks repeatedly, **When** seeks occur in quick succession, **Then** the player settles on the last requested position without leaving audio and the displayed position out of sync.

---

### Edge Cases

- **Stalled stream with no recovery**: The stream stalls and never recovers within the recovery window—system surfaces a clear error and applies the defined fallback (skip or stop) without hanging.
- **Source unavailable**: A track's source returns an error or cannot be found—system reports it clearly and continues with the rest of the queue where possible.
- **Rapid input flooding**: The listener spams next/previous/seek/play faster than the system can react—no stuck state, no runaway advancing, and the final state is correct.
- **Offline / cached vs. live source mismatch**: A previously cached track fails to play—system falls back to the live source transparently, or reports failure if neither works.
- **Queue exhaustion**: The last track ends or all remaining tracks fail—system stops cleanly with appropriate messaging rather than looping silently or freezing.
- **Background/inactive tab**: Playback continues correctly when the tab is backgrounded and state remains consistent when the listener returns.
- **Resuming a restored session**: After reopening the app, the listener resumes a prior session and playback continues from the saved track and position reliably on the first play.
- **Very long tracks and seeking near the end**: Seeking to late positions in long tracks lands accurately and resumes playing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST begin audible playback of a selected track within the defined start-time target under normal network conditions, or surface a clear loading state if it cannot.
- **FR-002**: System MUST play a track to its natural end without unintended interruptions, premature stops, or silent gaps when the source and network are healthy.
- **FR-003**: System MUST detect buffering/stalled conditions during playback and automatically attempt recovery (resume from the current position) without requiring listener action, tolerating up to approximately 10 seconds of buffering/stall before declaring a final failure.
- **FR-004**: System MUST automatically retry transient load/playback failures up to 3 times with a brief backoff between attempts before declaring a final failure.
- **FR-005**: System MUST, upon final failure of a track, present a brief non-blocking listener-facing notice and automatically advance to the next playable track without freezing the player; it MUST stop gracefully only when the queue has no further playable tracks.
- **FR-006**: System MUST keep the audio being heard, the queue position, and the now-playing display in agreement at all times.
- **FR-007**: System MUST advance exactly one position on a natural track end (no double-advance, no skipped tracks).
- **FR-008**: System MUST handle rapid successive next/previous actions by settling on the single correct final track and cancelling superseded in-flight track loads.
- **FR-009**: System MUST apply the listener-selected transition style (none, gapless, or crossfade) consistently for both natural track ends and manual skips. Crossfade MUST overlap the outgoing and incoming track audio with a configurable fade duration (a true crossfade, not merely a fade-out followed by the next track starting).
- **FR-010**: System MUST apply a change to the transition style (or other playback preferences) to subsequent transitions without requiring an app reload or restart.
- **FR-011**: System MUST keep transport controls (play, pause, next, previous, volume) responsive and consistent even while a track is loading or buffering.
- **FR-012**: System MUST allow seeking to any position within the current track and resume playback from the requested position accurately, including positions late in long tracks. This MUST hold for both cached tracks and live streams; the streaming proxy MUST support byte-range requests end-to-end so that live-stream seeking is reliable.
- **FR-013**: System MUST handle browser autoplay restrictions by clearly prompting the listener and starting playback from the intended position on the first interaction.
- **FR-014**: System MUST recover from a failed cached source by falling back to the live source, and report a failure only if no source can play.
- **FR-015**: System MUST stop cleanly with appropriate messaging when the queue is exhausted or all remaining tracks fail, rather than hanging or looping silently.
- **FR-016**: System MUST preserve and resume a restored session from the saved track and position reliably on the first play attempt.
- **FR-017**: System MUST surface playback failures that are caused by silent background operations (e.g., transition preloading) in a way that does not produce unexplained audible gaps.
- **FR-018**: System MUST maintain consistent playback state when the browser tab is backgrounded and when the listener returns.
- **FR-019**: System MUST provide automated test coverage for the core playback lifecycle (load, play, pause, seek, transition, error, retry, recovery) sufficient to prevent regressions.

### Key Entities *(include if feature involves data)*

- **Playback Session**: The listener's current listening state—the active track, current position, play/pause state, volume, and selected transition style; persists across app restarts for restore.
- **Playback Queue**: The ordered list of tracks with the current position, including which tracks have been skipped or failed.
- **Track Source**: A playable origin for a track (cached copy or live stream) with associated readiness and error state; a track may have more than one candidate source with a defined fallback order.
- **Playback Failure**: A classified description of why playback could not proceed (e.g., source unavailable, network/stall, decode/format, autoplay blocked), used to decide messaging and recovery behavior.
- **Transition**: The behavior applied when moving between two tracks (none, gapless, or crossfade), governing timing and overlap.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 99% of play attempts under normal network conditions produce audible playback within 2 seconds of the listener pressing play.
- **SC-002**: At least 99% of tracks that begin playing reach their natural end without an unintended stop or silent gap under healthy source/network conditions.
- **SC-003**: At least 95% of transient interruptions (brief network drops or stalls) recover automatically and resume playback without listener action.
- **SC-004**: 100% of natural track ends advance by exactly one queue position (zero double-advances or unintended skips) across a representative test run.
- **SC-005**: After rapid next/previous input (10+ presses faster than load time), the player lands on and plays the correct final track 100% of the time with no stuck state.
- **SC-006**: The audio being heard, queue position, and now-playing display are in agreement in 100% of observed transitions.
- **SC-007**: Seeking lands within 1 second of the requested position and resumes playing in at least 99% of attempts, including late positions in long tracks.
- **SC-008**: A change to the transition style takes effect on the very next transition 100% of the time without an app reload.
- **SC-009**: Final playback failures always present a listener-facing message and apply the defined fallback (advance or stop) with zero frozen-player occurrences in testing.
- **SC-010**: Automated tests cover the core playback lifecycle (load, play, pause, seek, transition, error, retry, recovery) such that introduced regressions in these paths are caught before release.
- **SC-011**: Listener-reported playback reliability issues are reduced by at least 75% relative to the pre-refactor baseline.

## Assumptions

- The refactor targets the existing web-based music player frontend and its streaming proxy backend; no change to the underlying music source provider is in scope.
- "Reliable" is defined primarily in terms of listener-observable behavior (start, continuity, recovery, correct transitions, accurate seeking) rather than a specific internal implementation.
- Existing playback features—queue, gapless and crossfade transition options, caching/pre-cache, session restore, and autoplay handling—are retained and made more robust, not removed. The currently incomplete crossfade style is to be fully implemented as a true overlapping crossfade.
- Normal network conditions assume a typical broadband or stable mobile connection; severe or sustained outages are expected to surface clear errors rather than indefinite recovery.
- The "previous" behavior rule is: restart the current track if more than ~3 seconds have elapsed, otherwise go to the previous track; this is made consistent, not redesigned.
- Performance targets (start time, seek latency) assume the listener's device meets the app's existing baseline browser/hardware support.
- Baseline reliability metrics for SC-011 are established from current behavior at the start of the refactor.
