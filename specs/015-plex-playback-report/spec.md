# Feature Specification: Plex Playback Reporting

**Feature Branch**: `015-plex-playback-report`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "The app needs to report back to plex what song is playing if the source of the song is from plex."

## Clarifications

### Session 2026-05-30

- Q: When does a listen count in Plex play history versus brief "now playing" only? → A: Native Plex lifecycle — report start, progress, pause, resume, and stop; Plex server decides what counts in history (same model as official Plex clients).
- Q: How should this app appear in Plex activity? → A: Fixed product name — always identify as DexAudio in Plex activity and session views.
- Q: Where do reporting controls live in Settings? → A: Plex Settings — playback-reporting toggle and health status live in the existing Plex server settings area.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plex reflects what I am listening to in this app (Priority: P1)

As a listener using this application to play music from my Plex library, I want Plex to know which track is currently playing (and when I pause or stop), so that Plex’s own activity views, play history, and listening statistics stay accurate for sessions started in this app—not only for plays on other Plex clients.

**Why this priority**: Without reporting, Plex treats this app as invisible: the user’s Plex dashboard, history, and in-app Top 10 stats (which read Plex play history) will not reflect listening done here. That breaks the expectation that “playing from Plex” updates Plex the same way other Plex clients do.

**Independent Test**: With a valid Plex connection, play any track from the library in this app for at least 30 seconds. In Plex’s own interface (e.g., activity or recently played for that user), the same track appears as recently played or currently active while playback is in progress, and the entry clears or updates when playback stops or the user skips away.

**Acceptance Scenarios**:

1. **Given** the user is connected to Plex and starts playback of a track from that server’s library, **When** audio begins, **Then** Plex receives a report identifying that track as the active item within 10 seconds of audible start, and Plex activity shows the client as **DexAudio**.
2. **Given** a Plex-sourced track is playing, **When** the user pauses, **Then** Plex is updated to reflect a paused or inactive state for that session within 10 seconds.
3. **Given** a Plex-sourced track is paused, **When** the user resumes, **Then** Plex again reflects that the same track is actively playing within 10 seconds.
4. **Given** a Plex-sourced track is playing, **When** the user skips to the next track in the queue, **Then** Plex stops reporting the previous track and reports the new track as active within 10 seconds of the new track starting.
5. **Given** a Plex-sourced track is playing, **When** playback ends, is skipped, or is paused and stopped, **Then** the application sends the appropriate lifecycle stop or state change and Plex applies its own rules for whether the session appears in play history (the app does not apply a separate completion threshold).
6. **Given** the user plays from the permanent or pre-cache (offline copy of a Plex track), **When** playback starts, **Then** reporting still occurs because the content originated from Plex—even if the bytes are served locally.

---

### User Story 2 - Non-Plex content is never reported (Priority: P2)

As a user who may use multiple music sources in the future, I want playback reporting to Plex to happen only when the playing item actually comes from my configured Plex server, so Plex is not polluted with incorrect activity.

**Why this priority**: Scope control prevents wrong history if the product later adds non-Plex sources. It is independently verifiable by confirming silence on Plex when no Plex-sourced item is playing.

**Independent Test**: If the application has no active Plex-sourced playback (no connection, or only hypothetical non-Plex items), confirm Plex shows no new activity attributed to this client.

**Acceptance Scenarios**:

1. **Given** Plex is not connected or credentials are invalid, **When** the user attempts local-only or cached playback without a valid Plex session, **Then** no playback reports are sent to Plex.
2. **Given** a track cannot be tied to an item on the configured Plex server, **When** the user plays it, **Then** no report is sent to Plex for that item.

---

### User Story 3 - Reporting survives brief outages (Priority: P3)

As a listener on an unreliable network, I want playback reporting to retry when Plex is temporarily unreachable, so a short dropout does not permanently lose play history for a session I actually heard.

**Why this priority**: Play history accuracy matters for stats and trust; retry behavior matches how the product already treats other outbound listening integrations.

**Independent Test**: Simulate Plex unreachable at track start, restore connectivity within the retry window, and verify the play still appears in Plex history.

**Acceptance Scenarios**:

1. **Given** a Plex-sourced track is playing and Plex is unreachable at the moment a report should be sent, **When** connectivity returns within 24 hours, **Then** the application retries and Plex eventually reflects the play (or active state) for that session.
2. **Given** reporting failures accumulate while Plex is down, **When** the user opens the Plex Settings section, **Then** they can see that reporting is degraded (e.g., pending count or last error) without blocking playback.
3. **Given** a report could not be delivered for more than 24 hours, **When** the retry window expires, **Then** that stale report is dropped so the queue does not grow without bound.

---

### Edge Cases

- What happens when the user changes Plex server or revokes access mid-playback? Reporting for the old server stops immediately; no reports are sent until a new valid connection exists.
- What happens on very short plays (skip within a few seconds)? The application still sends start and stop lifecycle events; whether Plex counts the session in play history is determined by Plex, not by an app-defined minimum listen duration.
- What happens during seek? Playback position reported to Plex stays reasonably aligned with audible position (within a few seconds), updated after seek completes.
- What happens with crossfade or gapless transitions? Each new Plex-sourced track is reported when it becomes the audibly dominant track.
- What happens when two browser tabs both play? Each tab may report independently; coordinating tabs is out of scope (same as existing playback spec).
- What happens when the user disables reporting in Settings? Using the toggle in the Plex Settings section stops all outbound reports until re-enabled; playback in the app is unaffected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When playback starts for a track whose source is the user’s configured Plex server, the system MUST report to Plex which item is playing within 10 seconds of audible start.
- **FR-002**: While a Plex-sourced track is actively playing, the system MUST periodically report playback position so Plex’s view of progress stays roughly aligned with what the user hears (within a few seconds).
- **FR-003**: When the user pauses a Plex-sourced track, the system MUST update Plex to reflect paused or inactive state within 10 seconds.
- **FR-004**: When the user resumes, skips, stops, or the track ends, the system MUST send the corresponding lifecycle update to Plex (new active item, paused state, or stopped session) within 10 seconds of the state change; the Plex server determines play-history eligibility—there is no separate in-app completion threshold.
- **FR-013**: For each Plex-sourced play session, the system MUST report the full lifecycle to Plex: playback started, periodic progress while playing, pause and resume when applicable, and stopped when the track ends, is skipped, or playback is halted—matching the behavior model of official Plex music clients.
- **FR-005**: The system MUST NOT send playback reports to Plex for content that is not from the configured Plex server.
- **FR-006**: The system MUST NOT send playback reports when Plex is not connected or authentication is invalid.
- **FR-007**: Playback from locally cached copies of Plex library items MUST still be reported as Plex-sourced plays.
- **FR-008**: When a report cannot be delivered, the system MUST queue it and retry with backoff for up to 24 hours, then drop expired entries.
- **FR-009**: Users MUST be able to disable Plex playback reporting via a toggle in the Plex Settings section (default: enabled). When disabled, no reports are sent and playback behavior is unchanged.
- **FR-010**: The Plex Settings section MUST surface reporting health (enabled/disabled state, pending retry count, and last failure when applicable) without requiring the user to leave the app to diagnose issues.
- **FR-011**: Reporting MUST use the same Plex user identity already established by the app’s Plex connection flow—no separate “reporting account” setup.
- **FR-014**: All playback reports sent to Plex MUST identify the client with the fixed product name **DexAudio** so users can distinguish this app from other Plex clients in activity and session views.
- **FR-012**: Reporting failures MUST NOT block or interrupt audio playback.

### Key Entities

- **Playback report**: A snapshot sent to Plex describing which library item is active, whether it is playing or paused, and approximate position in the track.
- **Plex-sourced track**: A playable item that maps to a specific track (rating key or equivalent stable identifier) on the user’s currently configured Plex server.
- **Report outbox**: Pending reports waiting for retry after transient Plex or network errors, with timestamps for expiry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In manual testing, 95% of Plex-sourced play sessions started with a healthy connection show the correct track in Plex activity or recently played within 15 seconds of audible start.
- **SC-002**: Pause and resume actions update Plex’s reflected state within 15 seconds in 95% of trials under normal network conditions.
- **SC-003**: When Plex is unreachable for under 5 minutes during a play, at least 90% of those sessions still appear in Plex history after connectivity returns (within the 24-hour retry window).
- **SC-004**: With reporting disabled via the Plex Settings toggle, zero new playback reports are observed on Plex during a 10-minute listening session.
- **SC-005**: Users can identify reporting status (on/off and whether retries are pending) from the Plex Settings section in under 10 seconds without technical logs.
- **SC-006**: When viewing Plex activity during a play session from this app, the client name **DexAudio** is visible in 100% of manual verification trials.

## Assumptions

- “Report back to Plex” means updating Plex’s server-side knowledge of client playback (active item, progress, and play history)—the same class of behavior users expect from official Plex music clients—not sending data to third-party services.
- All music played through this application today originates from Plex; the “Plex source only” rule future-proofs the product if other sources are added later.
- Default is reporting enabled, because users who connect Plex generally expect their Plex history and stats to include this app’s listening.
- Position update frequency can follow industry-typical intervals (e.g., every 10–30 seconds during play and on significant events like seek or track change) without specifying implementation.
- Play-history eligibility is decided by Plex after lifecycle events are delivered; the application does not invent plays or apply a custom “counted as listened” threshold beyond sending accurate start, progress, pause, resume, and stop signals.
- In-app Top 10 and other Plex-history-driven features continue to use Plex as the source of truth; this feature makes those stats accurate for listening done here.
- Last.fm scrobbling remains a separate integration; this feature does not replace or duplicate Last.fm behavior.
- The canonical Plex client display name is **DexAudio** (fixed; not user-editable in v1).
