# Feature Specification: Gapless Playback

**Feature Branch**: `005-gapless-playback`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description (from Linear project [Gapless playback](https://linear.app/audiodex/project/gapless-playback-e3d5fd65f036/overview)): "When playing songs, the next song in the queue should be pre-cached so that when the current song ends, there is no gap between songs. This should be a toggle in settings to turn on gapless playback."

## Clarifications

### Session 2026-05-20

- Q: How should gapless playback integrate with the existing look-ahead pre-cache? → A: When gapless is enabled, raise look-ahead pre-cache depth so at least the next 2 tracks in the queue are always prepared.
- Q: Should the user be notified when gapless preparation fails and a transition has a perceptible gap? → A: Silent degrade — advance with no extra message; only existing playback errors (load failure, etc.) are shown.
- Q: Should Previous (backward) queue jumps be gapless, and how does pre-cache prioritize tracks? → A: Bidirectional pre-cache with fixed priority: (1) immediate next in queue, (2) immediate previous (whether or not already played), (3) second track ahead in queue, (4) track two positions before current. Previous transitions are gapless when the target track is prepared under this scheme; otherwise silent degrade applies.
- Q: When pre-cache is at capacity, may gapless priority slots evict other cached tracks? → A: Yes — gapless priority slots may evict other pre-cache entries outside the four-slot window; pinned permanent-cache items are never evicted for gapless.
- Q: Do silent-degrade transitions count toward the SC-001 95% gapless success metric? → A: Include all — every natural end-of-track and Next transition with gapless enabled counts; preparation-timeout degrades are metric failures.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seamless transitions between queued tracks (Priority: P1)

As a listener playing through an album or queue, I want the next track to begin immediately when the current track ends, without a noticeable pause or silence between them, so that continuous listening feels natural—especially for albums where tracks are meant to flow together.

**Why this priority**: Audible gaps between tracks break immersion and are especially jarring on albums with intentional segues. Eliminating gaps is the core value of this feature.

**Independent Test**: With gapless playback enabled, a Plex library connected, and at least two playable tracks in the queue, play the first track through to its natural end. The second track's audio begins with no perceptible silence between the end of the first and the start of the second. Repeat with manual Next before the first track ends—the same seamless handoff occurs.

**Acceptance Scenarios**:

1. **Given** gapless playback is enabled and two or more playable tracks are in the queue, **When** the current track reaches its natural end, **Then** the next track's audio begins with no perceptible gap (silence) between tracks.
2. **Given** gapless playback is enabled and a next track exists in the queue, **When** the user presses Next while the current track is playing, **Then** the next track begins with no perceptible gap from the moment the previous track stops.
2b. **Given** gapless playback is enabled and a previous track exists in the queue (whether or not it was already played), **When** the user presses Previous to return to that track and it has been prepared per the bidirectional cache priority, **Then** that track begins with no perceptible gap; if not yet prepared, playback still advances with silent degrade (no gapless-specific message).
3. **Given** gapless playback is enabled and the user starts playback from an album, **When** consecutive album tracks play in queue order, **Then** each transition to the following track is seamless through the full album sequence.
4. **Given** gapless playback is enabled and the current track is the last in the queue, **When** it ends, **Then** playback stops cleanly with no error and no attempt to play a non-existent next track.
5. **Given** gapless playback is disabled, **When** the current track ends and the next begins, **Then** behavior matches the pre-gapless experience (a brief transition gap is acceptable and unchanged from today).

---

### User Story 2 - User controls gapless playback in Settings (Priority: P1)

As a user who prefers either seamless albums or traditional track boundaries, I want a clear on/off toggle for gapless playback in Settings, so that I can choose the listening experience that suits me without it being forced on everyone.

**Why this priority**: Gapless playback changes how transitions feel and may interact with other playback preferences; users must be able to opt in explicitly.

**Independent Test**: Open Settings, locate the gapless playback control in the Playback section, toggle it on and off, and confirm the choice persists after closing Settings and reloading the application. With the toggle off, queue transitions behave as before; with it on, acceptance scenarios from User Story 1 pass.

**Acceptance Scenarios**:

1. **Given** the user opens Settings, **When** they navigate to the Playback section, **Then** a labeled toggle for gapless playback is visible with a short description of what it does.
2. **Given** gapless playback has never been configured, **When** the user first opens Settings, **Then** gapless playback is off by default.
3. **Given** the user enables gapless playback, **When** they leave Settings and return later (or reload the app), **Then** gapless playback remains enabled.
4. **Given** the user disables gapless playback while music is playing, **When** the current track ends, **Then** the transition to the next track uses non-gapless behavior; gapless does not apply retroactively to the track already playing.
5. **Given** the user enables gapless playback while music is playing, **When** the current track ends, **Then** gapless behavior applies to that transition and subsequent ones.

---

### User Story 3 - Gapless works with existing queue and playback flows (Priority: P2)

As a user who builds queues from albums, search, or auto-queued similar songs, I want gapless playback to apply consistently whenever a next track is already in the queue, so that I do not have to use a special "gapless mode" for certain sources.

**Why this priority**: Gapless must feel like a property of playback, not a separate workflow tied to one entry point.

**Independent Test**: Enable gapless playback. Create queues from at least three sources (album play, add-to-queue from search, auto-queued similar tracks after queue runs low). Verify seamless transitions at each source's natural advance point.

**Acceptance Scenarios**:

1. **Given** gapless playback is enabled and the user invoked "Play now" on an album, **When** tracks advance through the resulting queue, **Then** each consecutive pair transitions seamlessly.
2. **Given** gapless playback is enabled and the user appended tracks via "Add to queue", **When** playback advances into those appended tracks, **Then** transitions remain seamless.
3. **Given** gapless playback is enabled and auto-queued similar songs have been appended, **When** playback crosses from user-added tracks into auto-queued tracks (or between auto-queued tracks), **Then** transitions remain seamless where a next track exists.
4. **Given** gapless playback is enabled and the next queued track is available from local cache, **When** the current track ends, **Then** the cached next track still begins without a perceptible gap.
5. **Given** gapless playback is enabled and the queue has neighbors around the current position, **When** the current track is playing, **Then** pre-cache resources are applied in priority order to: immediate next, immediate previous, second track ahead, then track two positions before current (skipping any slot that does not exist in the queue).

---

### Edge Cases

- The next track in the queue cannot be prepared in time (slow network, large file, server delay)—playback must still advance to the next track using existing failure and retry behavior from song playback; any gap must be no worse than with gapless disabled, and the user is not left with a silent stall. No additional user-visible message is shown for preparation-timeout degradation; only hard playback failures (per song-playback rules) surface notifications.
- The next queued track fails to load (unsupported format, missing on server)—existing per-track failure handling applies; gapless must not block skip-to-next or error messaging.
- Only one track remains in the queue—no next track to prepare; current track ends normally with no error.
- Current track is very short (under a few seconds)—system still attempts seamless handoff when a next track exists; if preparation cannot complete in time, behavior degrades gracefully as above.
- User rapidly skips through several tracks—only the most recently selected track plays; preparation for abandoned next-track attempts is cancelled without stale audio or duplicate transitions; bidirectional cache priorities are recalculated from the new current position.
- Queue has fewer than four neighbors (start of queue, end of queue, or single-track queue)—only existing slots in the priority list are prepared; missing slots are skipped without error.
- Pre-cache is full when a high-priority gapless slot needs preparation—lower-priority pre-cache entries outside the four-slot window may be evicted; pinned permanent-cache items are never sacrificed; if space still cannot be made, silent degrade applies on the affected transition.
- Gapless playback is enabled while crossfade is also enabled—crossfade is automatically turned off when gapless is turned on, and the user sees a brief explanation that the two modes cannot run together; turning crossfade on later disables gapless with the same explanation.
- User pauses near the end of a track for an extended period—when playback resumes and the track eventually ends, seamless transition to the next track still applies if gapless is enabled.
- Device sleeps or tab is backgrounded mid-track—on resume, either seamless advance still works for the remaining portion or existing playback recovery rules apply without silent failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a user-facing on/off control for gapless playback in the Playback section of Settings.
- **FR-002**: Gapless playback MUST be disabled by default for new and existing users until they explicitly enable it.
- **FR-003**: The user's gapless playback preference MUST persist across application restarts and Settings visits.
- **FR-004**: When gapless playback is enabled and a next track exists in the queue, the system MUST prepare the next track before the current track ends so that playback of the next track can begin immediately when the current track finishes.
- **FR-004a**: When gapless playback is enabled, the system MUST maintain bidirectional pre-cache for up to four queue neighbors around the current track, using this strict priority order when bandwidth or storage is constrained: (1) immediate next in queue, (2) immediate previous in queue (played or unplayed), (3) second track ahead in queue, (4) track two positions before the current track. Lower-priority slots MAY be deferred or evicted first; higher-priority slots MUST be prepared before lower ones when the queue contains those items.
- **FR-004b**: When gapless is enabled and the user's configured look-ahead pre-cache depth is below 2, the effective forward depth MUST be raised to at least 2 to satisfy slots (1) and (3); backward slots (2) and (4) use the same pre-cache mechanism, not a separate system.
- **FR-004c**: When pre-cache is at capacity and a higher-priority gapless slot (per FR-004a order) needs space, the system MAY evict other pre-cache entries that fall outside the current four-slot window. Pinned permanent-cache items MUST NOT be evicted to satisfy gapless preparation.
- **FR-005**: When gapless playback is enabled, forward transitions (natural end-of-track and Next) MUST begin the target track with no perceptible silence under normal network conditions when that track is prepared per FR-004a.
- **FR-005a**: When gapless playback is enabled, backward transitions via Previous to a prior queue item MUST be gapless when that item is prepared per FR-004a priority (2) or (4); if not yet prepared, the system MUST still switch tracks without a gapless-specific message (silent degrade per FR-010a).
- **FR-006**: When gapless playback is disabled, the system MUST NOT change existing transition timing or behavior beyond what was already in place before this feature.
- **FR-007**: Changes to the gapless setting MUST take effect starting with the next track transition after the setting is saved; they MUST NOT restart or interrupt the currently playing track solely because the setting changed.
- **FR-008**: Gapless playback MUST apply to all queue advance paths that have a known next item (album play-through, manual queue, auto-queued similar songs) without requiring a separate mode per source.
- **FR-009**: When no next track exists in the queue, the system MUST end playback cleanly without attempting gapless preparation.
- **FR-010**: When the next track cannot be prepared in time, the system MUST still advance to that track using existing playback and error flows; gapless MUST NOT cause indefinite silence or block queue advance.
- **FR-010a**: When gapless preparation completes too late and a perceptible gap occurs, the system MUST NOT show a gapless-specific notification; degradation is silent unless a separate hard playback failure triggers existing song-playback error messaging.
- **FR-011**: When gapless playback is enabled, crossfade MUST be automatically disabled; when the user later enables crossfade, gapless MUST be automatically disabled. Each mutual disable MUST surface a short, non-blocking notice explaining that gapless and crossfade cannot run together.
- **FR-012**: Rapid queue changes (skip, play-now, remove next item) MUST cancel in-flight preparation for tracks that are no longer the immediate next item, consistent with existing rules that only the user's latest playback intent wins.
- **FR-013**: Gapless preparation MUST work when the next track is served from cache or from the server, without requiring the user to distinguish the source.

### Key Entities

- **Gapless Playback Preference**: The user's persisted choice (enabled or disabled) controlling whether seamless queue transitions are active.
- **Queue Transition**: The moment playback moves from one queue item to the next—triggered by natural track end, Next, or recovery after skip/failure handling.
- **Next-Track Preparation**: The readiness state of a queue item such that its audio can start immediately on transition; when gapless is enabled, up to four neighbors (next, previous, second-ahead, two-behind) are prepared in strict priority order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With gapless playback enabled under normal network conditions, at least 95% of **forward** queue transitions (natural end-of-track and Next) in a 10-track test playlist produce no perceptible silence gap, as verified by listener evaluation or automated audio-level analysis. Every such transition counts toward the metric, including those that silent-degrade due to preparation timeout (those count as failures). Previous/backward transitions are not part of this percentage.
- **SC-002**: With gapless playback enabled, median time from end of outgoing audio to start of incoming audio on natural track advance is under 50 milliseconds in tests on a typical home network with supported formats, measured over the same forward transition set as SC-001 (all transitions count; degrades worsen the median).
- **SC-003**: With gapless playback disabled, measured transition gaps and failure behavior are unchanged from the pre-feature baseline (regression check on the same 10-track playlist).
- **SC-004**: 100% of testers can locate, toggle, and confirm persistence of the gapless setting within 30 seconds without documentation.
- **SC-005**: When gapless is enabled and crossfade was previously on, 100% of testers observe crossfade disabled and understand why from the displayed notice, without conflicting overlap-and-gapless behavior.
- **SC-006**: When the next track fails to load, queue advance and user-visible error behavior match existing song-playback requirements within 5 seconds; gapless introduces zero additional silent-failure cases.

## Assumptions

- Song playback (feature 004) is working: tracks play, the queue advances, and failure messages behave as specified there. This feature improves transition quality, not basic playability.
- A playback queue with ordered items already exists from features 001–004; gapless does not redefine queue construction.
- "Perceptible gap" means silence or dead air noticeable to a typical listener on desktop speakers or headphones; sub-50 ms boundaries are treated as seamless.
- Crossfade (optional setting from feature 001) remains available but is mutually exclusive with gapless; users choose one continuous-transition style at a time.
- When gapless playback is enabled, pre-cache integrates with feature 001's look-ahead mechanism but extends it bidirectionally with a four-slot priority list (next → previous → second-ahead → two-behind); forward depth is at least 2. This is one coordinated pre-cache policy, not a separate parallel system.
- Gapless applies to consecutive items in the active queue only, not to hypothetical tracks the user has not queued.
- Multi-tab playback coordination remains out of scope; each tab maintains its own gapless preference and session.
- Live/concert recordings with long applause gaps between tracks are still played as stored; gapless removes player-induced silence, not intentional silence inside a single file.
