# Feature Specification: Song Playback

**Feature Branch**: `004-song-playback`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description (from Linear project [Song playback](https://linear.app/audiodex/project/song-playback-db1d944a0407/overview)): "When a song is selected to play, I want the song to play and the state of the song play to be reflected in the now playing view. Currently, the queue loads, but nothing actually plays. It currently either shows 'Unsupported' or just doesn't play, with no message. If a song cannot play, I want a message showing the details of why."

## Clarifications

### Session 2026-05-20

- Q: Which audio formats should the player support? → A: Browser-native decoding for FLAC, MP3, AAC/M4A, OGG/Opus; server-side transcoding fallback for all other codecs (ALAC, WMA, WAV, etc.); unsupported error only when transcoding also fails.
- Q: What should happen when a track in the queue fails to play? → A: Hybrid — auto-skip with non-blocking notification for individual track failures (unsupported format, not found); stop and show blocking prompt for session-level failures (auth expired, server unreachable, network down).
- Q: Should transcoding use Plex's built-in API or an app-managed tool like ffmpeg? → A: Use Plex's built-in transcoding API; no new transcoding dependencies on the app backend.
- Q: How should playback error messages be presented — toast, inline banner, or both? → A: Toast for auto-skipped individual track failures; inline banner in Now Playing view for blocking session-level failures (auth, network).
- Q: Should multiple browser tabs be prevented from playing audio simultaneously? → A: Out of scope — each tab operates independently; defer multi-tab coordination to a future feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Selecting a song actually plays audio (Priority: P1)

As a user with a synced Plex library, I want to click play on any song, album, or queued track and hear the audio start within a couple of seconds, so that the core promise of the music app — listening to music — is actually delivered.

**Why this priority**: Playing audio is the primary purpose of the application. Today the queue loads but no audio is produced, which makes the entire app non-functional for its main use case. Every other feature (queue management, scrobbling, similar tracks, library browsing) depends on this working.

**Independent Test**: With a populated Plex library connected, click any play affordance (album card play overlay, track row play button, queue item). Within 2 seconds, audio for the selected song is audibly playing through the browser's audio output, and the Now Playing view is visible with the song's title, artist, and album displayed.

**Acceptance Scenarios**:

1. **Given** the user is on the albums view and Plex is connected, **When** they click the play overlay on a supported-format album, **Then** the first track's audio begins playing within 2 seconds and the Now Playing view becomes the active view showing that track.
2. **Given** the user is on an album detail page, **When** they click the play button on an individual track, **Then** the selected track begins playing within 2 seconds and the Now Playing view shows that track.
3. **Given** a track is currently playing, **When** the track reaches its end, **Then** the next track in the queue begins playing automatically within 1 second with no manual action required.
4. **Given** a track is currently playing, **When** the user clicks Next, **Then** the current track stops and the next queued track begins playing within 1 second.
5. **Given** a track is currently playing, **When** the user clicks Previous, **Then** playback moves to the previous queued track and begins playing within 1 second.
6. **Given** a track is paused, **When** the user clicks Play, **Then** playback resumes from the same position within 500 ms.

---

### User Story 2 - Now Playing view accurately reflects playback state (Priority: P1)

As a user with audio playing, I want the Now Playing view to always show what is actually happening — which track is playing, whether it is paused or playing, current elapsed time, total duration, and current queue position — so that I trust the controls and never wonder whether the app is in sync with the audio I hear.

**Why this priority**: Without accurate state reflection, users cannot tell whether their click actually did anything, whether the app is loading or stuck, or which track they are listening to. State accuracy is foundational to the user's trust in the player.

**Independent Test**: With audio playing, open the Now Playing view and verify: (a) the displayed title/artist/album match the audible track, (b) the play/pause indicator matches the audio state, (c) the elapsed-time counter advances at one second per real second of audio, (d) the duration value matches the track's true length, (e) the queue position highlights the currently playing track.

**Acceptance Scenarios**:

1. **Given** a track is playing, **When** the user views the Now Playing view, **Then** the displayed track title, artist name, and album name match the audio being heard.
2. **Given** a track is playing, **When** the user views the Now Playing view, **Then** the play/pause control shows the "pause" state (because clicking it would pause), and pressing it pauses the audio within 500 ms.
3. **Given** a track is paused, **When** the user views the Now Playing view, **Then** the play/pause control shows the "play" state, the elapsed-time counter is frozen at the paused position, and pressing the control resumes audio within 500 ms.
4. **Given** a track is playing, **When** the user observes the elapsed-time counter for 10 seconds of wall-clock time, **Then** the elapsed-time counter advances by 10 ± 1 seconds (matching the audible playback position).
5. **Given** a track has been fully loaded, **When** the user views the Now Playing view, **Then** the displayed duration equals the track's true duration (within 1 second tolerance).
6. **Given** the queue contains multiple tracks and one is currently playing, **When** the user views the Now Playing view, **Then** the queue panel marks the currently playing track as the active item and the active item changes as playback advances.
7. **Given** the user seeks to a specific position using the progress control, **When** the seek completes, **Then** the elapsed-time counter and audible playback position both jump to within 500 ms of the requested position.
8. **Given** the user adjusts the volume control, **When** the slider moves, **Then** the audible output volume changes accordingly and persists when the next track begins.

---

### User Story 3 - Playback failures show a clear, actionable message (Priority: P1)

As a user who clicked play and didn't hear audio, I want a clear visible message telling me what went wrong (unsupported format, server unreachable, authentication expired, track not found, etc.) and what I can do next, so that I can either fix the problem or skip the track instead of staring at a silent player.

**Why this priority**: Silent failures are the most damaging user experience — the user has no way to know whether they should wait, retry, change a setting, contact support, or give up. Visible, specific error messages turn a broken experience into an actionable one and are critical for the user to recover.

**Independent Test**: Attempt to play a track that cannot be played (for example, by selecting a track in an unsupported format, or while the Plex server is unreachable). Within 5 seconds, a user-visible message appears that names the cause and offers at least one next step (skip, retry, open settings, or "see details" with a reason code). The message is dismissible or auto-clears after the user takes action.

**Acceptance Scenarios**:

1. **Given** the user clicks play on a track whose audio format the player cannot decode (for example, an unsupported codec from the Plex server), **When** the player attempts to load the track, **Then** within 5 seconds a visible message appears identifying the cause as an unsupported format, naming the format if known, and offering a "Skip" affordance.
2. **Given** the Plex server is unreachable (network down, server offline, wrong server URL), **When** the user clicks play on any track, **Then** within 5 seconds a visible message identifies the cause as a connection problem and offers a "Retry" affordance.
3. **Given** the user's Plex authentication has expired or been revoked, **When** the user clicks play on any track, **Then** within 5 seconds a visible message identifies the cause as an authentication problem and offers a link to re-authenticate (or to the Plex settings page).
4. **Given** a queued track exists on the user's queue but has been removed or moved on the Plex server, **When** the player attempts to load that track, **Then** within 5 seconds a visible message identifies the track as missing and offers a "Skip" affordance.
5. **Given** the browser blocks audio playback because no recent user gesture has been made (autoplay policy), **When** the player attempts to start audio, **Then** within 5 seconds a visible message identifies that playback is blocked by the browser and offers a single-click "Play" affordance that satisfies the gesture requirement.
6. **Given** a track in the middle of the queue fails for any reason, **When** the failure is detected, **Then** the user-visible message identifies the failed track by title and artist, **And** the queue advances to the next playable track automatically without the user having to click again.
7. **Given** every track in the current queue is unplayable, **When** the player has exhausted all queued tracks, **Then** a final visible message states that no queued tracks could be played and offers either "Back to library" or "Retry queue" affordances.
8. **Given** a failure message is displayed, **When** the user clicks "See details" (or equivalent affordance), **Then** the technical reason code, the affected track identifier, and any server-provided detail are visible, suitable for copying into a bug report.
9. **Given** a failure message is displayed, **When** the user takes the suggested next action (Skip, Retry, Sign in, etc.) or dismisses the message, **Then** the message disappears and any successful resulting state (such as a new track playing) replaces it.

---

### Edge Cases

- A track loads its metadata successfully but the audio stream itself returns an error mid-load — must be treated as a playback failure with a visible message, not a silent stall.
- A track plays partially, then the network drops and audio stops — the user must see a message identifying the loss of connection and an option to retry.
- The user has multiple browser tabs of the app open and presses play in each — each tab operates independently; multi-tab coordination is out of scope for this feature and deferred to a future enhancement.
- The user clicks play very rapidly on multiple tracks in succession — only the most recently selected track plays; earlier load attempts must be cancelled cleanly without producing overlapping audio or stale error messages.
- A track's reported duration disagrees with the actual decoded length — the Now Playing view must reflect the true playable duration, not the reported one, once the discrepancy is known.
- The same track is requested twice (e.g., user clicks play on the currently playing track) — playback restarts the track from the beginning and the Now Playing view stays in sync.
- The cached copy of a track is corrupted — the player must detect the failure, fall back to the live stream, and only show an error if both fail.
- Audio resumes after the device wakes from sleep — playback either continues from the paused position or surfaces a "playback was paused" message; it must not silently desync.
- The user disconnects from Plex (in settings) while audio is playing — playback continues to the end of the current track (already buffered) and the next track surfaces an authentication error.
- A playlist or album mixes supported and unsupported formats — supported tracks play, unsupported tracks surface a per-track message and are skipped, queue position is preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the user clicks any play affordance (album card overlay, track row play button, queue item, Now Playing controls), the system MUST initiate audio playback of the selected track on the user's device.
- **FR-002**: Audio playback MUST become audible within 2 seconds of the user's play action under normal network conditions (excluding initial buffering of very large files).
- **FR-003**: When a track ends, the system MUST automatically advance to the next track in the queue and begin its playback within 1 second.
- **FR-004**: The Now Playing view MUST display the title, artist, album, and cover art of the track currently being played, updating automatically when the active track changes.
- **FR-005**: The Now Playing view MUST show a play/pause control whose visual state (showing "play" vs "pause") reflects the live audio state at all times.
- **FR-006**: The Now Playing view MUST show an elapsed-time counter that advances at real time during playback and freezes during pause, matching the audible playback position within 500 ms.
- **FR-007**: The Now Playing view MUST show the total duration of the currently playing track once known, accurate within 1 second of the true length.
- **FR-008**: The Now Playing view MUST provide play, pause, next, previous, seek, and volume controls; each control MUST take effect on the audible audio within 500 ms of activation.
- **FR-009**: The Now Playing view MUST display the queue and highlight the currently playing track within the queue, updating as the active track changes.
- **FR-010**: When clicking play from outside the Now Playing view (e.g., albums view, album detail), the system MUST switch the active view to Now Playing as part of the play action.
- **FR-011**: When a track cannot be played for any reason, the system MUST display a user-visible message within 5 seconds of the failure being detected; silent failures are not acceptable. Individual track failures that are auto-skipped MUST use a non-blocking toast notification (auto-dismiss after ~5 seconds unless interacted with). Session-level failures (auth, network, server unreachable) that stop playback MUST use an inline banner within the Now Playing view.
- **FR-012**: Each playback failure message MUST identify the cause in user-comprehensible language using one of the following categories: unsupported audio format, server unreachable, authentication expired or invalid, track not found on server, network interrupted mid-playback, browser blocked autoplay, or unknown error.
- **FR-013**: Each playback failure message MUST identify the affected track by title and artist where that information is available.
- **FR-014**: Each playback failure message MUST offer at least one next-step affordance appropriate to its category (Skip, Retry, Sign in / re-authenticate, Open Plex settings, Back to library).
- **FR-015**: Each playback failure message MUST include a "See details" affordance (or always-visible secondary line) that exposes the technical reason code, the affected track identifier, and any server-provided detail, suitable for copying into a bug report.
- **FR-016**: When a non-final queue item fails due to an individual track issue (unsupported format, track not found on server), the system MUST auto-skip to the next playable track and surface a non-blocking notification identifying the skipped track and the reason. When a non-final queue item fails due to a session-level issue (server unreachable, authentication expired, network interrupted), the system MUST stop playback and display a blocking prompt requiring the user to choose an action (Retry, Sign in, Back to library) before the queue advances.
- **FR-017**: When every track in the current queue fails to play, the system MUST display a terminal message stating that no tracks could be played and offer "Back to library" and "Retry queue" affordances.
- **FR-018**: The system MUST handle browser autoplay restrictions by detecting the failure, presenting a visible "Play" affordance that satisfies the gesture requirement, and resuming the original play intent on a single user click.
- **FR-019**: Playback failure messages MUST be dismissible by the user, and MUST auto-clear when a subsequent successful play action replaces them.
- **FR-020**: The system MUST support playback of FLAC, MP3, AAC/M4A, and OGG/Opus natively via browser decoding. For any other codec present in the Plex library (e.g., ALAC, WMA, WAV), the system MUST fall back to Plex's built-in transcoding API to deliver a browser-decodable stream. No new transcoding dependencies (e.g., ffmpeg) are introduced on the app backend. Only if Plex transcoding also fails should the system surface an "unsupported format" failure message.
- **FR-021**: Rapid successive play actions (e.g., user clicks play on multiple tracks in quick succession) MUST result in only the most recently selected track playing; earlier in-flight load attempts MUST be cancelled cleanly without producing overlapping audio or surfacing stale error messages.
- **FR-022**: When the same track that is already playing is selected again, the system MUST restart that track from the beginning rather than ignoring the action.
- **FR-023**: Volume changes made by the user MUST persist across track transitions within a session.
- **FR-024**: When a cached copy of a track is corrupted or otherwise unplayable, the system MUST automatically fall back to streaming the track live before surfacing a failure message.
- **FR-025**: The system MUST log all playback failures (with reason code, track id, and server detail) to the existing error/diagnostics channel so operators can investigate, regardless of whether the user dismisses the visible message.

### Key Entities *(include if feature involves data)*

- **Playback Session**: Represents the user's current listening session — which track is currently active, the play/pause state, elapsed position, volume, and the ordered queue. Holds the link between user-visible state in the Now Playing view and the underlying audio engine.
- **Queue Item**: A single entry in the playback queue, identifying a specific track by its server-side identifier and capturing metadata (title, artist, album, cover art reference, reported duration) needed by the Now Playing view.
- **Playback Failure**: A user-visible record of a play attempt that did not result in audible audio. Carries a category (unsupported format / unreachable / auth / not-found / network / autoplay-blocked / unknown), a human-readable summary, a technical detail string, the affected queue item, the available next-step affordances, and a timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of play actions issued against a supported-format track on a reachable, authenticated Plex server result in audible audio playing within 2 seconds.
- **SC-002**: 0% of play actions result in a silent failure — every failure to produce audio results in a user-visible message within 5 seconds.
- **SC-003**: The Now Playing view's displayed track title, artist, album, play/pause state, elapsed time, and queue position match the actual audio output state in 100% of observed transitions (start, pause, resume, seek, next, previous, end-of-track auto-advance).
- **SC-004**: After a failure on a non-final queued track, the queue automatically resumes playing the next playable track without manual intervention in at least 95% of cases (the remaining ≤5% being cases where the user chose to stop or every subsequent track also fails).
- **SC-005**: When a failure message is shown, at least 90% of users in usability testing can correctly state the cause and the next step they should take after reading the message once.
- **SC-006**: The elapsed-time counter in the Now Playing view stays within ±1 second of the actual audio playback position throughout 100% of a continuous 10-minute playback.
- **SC-007**: Median time from "track ends" to "next track audible" during automatic queue advance is under 1 second.
- **SC-008**: Zero overlapping-audio incidents occur when the user issues rapid successive play actions, verified by an automated test that fires 5 play actions in 1 second and asserts only one audio source is producing output at the end.

## Assumptions

- The existing Plex authentication, library sync, and queue construction flows from features 001/002/003 continue to work and are out of scope here; this feature trusts that a queue can be built and a stream URL can be requested.
- The user already has Plex connected and at least one playable track in their library; first-time-setup flows are owned by feature 002.
- "Now Playing view" refers to the existing `NowPlayingPage` route surfaced by feature 001; this feature changes its behavior and correctness but does not redesign its overall layout.
- Audio output uses the user's browser default output device; in-app device selection is out of scope.
- Crossfade behavior (already present in the player) continues to apply where enabled by the user; this feature does not alter crossfade rules.
- Scrobbling, similar-track prefetch, and pre-caching continue to work in their existing forms; this feature does not change their triggers, only the underlying playback state they observe.
- Server-side stream endpoints (`/api/v1/stream/:trackId`) are the canonical source of audio bytes; the endpoint must be updated to pass through browser-native formats (FLAC, MP3, AAC/M4A, OGG/Opus) without blocking and to request Plex-native transcoding for non-native codecs.
- "Visible message" means an in-app UI element (banner, toast, or inline notice) that does not require the user to leave the page or open developer tools to read it.
- Mobile/touch playback is in scope to the same extent as desktop; no native mobile player is involved.
- Multi-tab audio coordination (preventing overlapping playback across browser tabs) is explicitly out of scope; each tab operates as an independent player instance.
