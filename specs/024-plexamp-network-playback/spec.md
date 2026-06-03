# Feature Specification: Play Music on Plexamp (Same Network)

**Feature Branch**: `024-plexamp-network-playback`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description (from Linear project [Play music on a Plexamp instance on the same network](https://linear.app/audiodex/project/play-music-on-a-plexamp-instance-on-the-same-network-cfce178093c0/overview)): "Play music on a Plexamp instance on the same network"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose Plexamp as where music plays (Priority: P1)

As a listener who runs Plexamp on another device on my home network (desktop, Raspberry Pi, always-on PC, etc.), I want to pick that Plexamp instance as my playback output in this application, so that when I browse my library and press play here, the music actually comes out of the speakers connected to Plexamp—not only from this browser tab.

**Why this priority**: This is the core outcome of the feature. Without a clear way to select Plexamp as the output and have play actions reach it, the feature delivers no value. It mirrors the familiar Plexamp "player selector" mental model users already know from first-party Plex apps.

**Independent Test**: With Plex connected, at least one Plexamp instance on the LAN with remote control enabled, and the user has selected that instance as the active output, click play on any album or track. Within a few seconds, audio is audible on the Plexamp device (verified on that device), while this application's Now Playing view shows the same track as active.

**Acceptance Scenarios**:

1. **Given** the user is connected to Plex and at least one eligible Plexamp player is available on the network, **When** the user opens the playback output selector, **Then** they see "This device" (local browser playback) and each discoverable Plexamp instance listed by a human-readable name (e.g., device name or room label).
2. **Given** the user selects a Plexamp instance as the active output, **When** they press play on a track from the library or queue, **Then** playback starts on that Plexamp instance within 5 seconds and this application does not play audio locally unless the user switches output back to "This device".
3. **Given** Plexamp is the active output, **When** the user presses pause, resume, next, or previous from this application, **Then** the Plexamp instance responds within 2 seconds and the Now Playing view reflects the new state.
4. **Given** Plexamp is the active output and a multi-track queue exists in this application, **When** the current track ends, **Then** the next queued track begins on Plexamp without requiring the user to press play again.
5. **Given** the user switches the active output from Plexamp back to "This device", **When** they press play on a track, **Then** audio plays through the browser as today (existing local playback behavior) and Plexamp stops being commanded for new play actions.

---

### User Story 2 - Discover Plexamp players on the network (Priority: P1)

As a user with one or more Plexamp installations at home, I want this application to show me which Plexamp players I can control without manually typing IP addresses, so that setup is quick and I do not need networking expertise.

**Why this priority**: Discovery is required for Story 1 to work in practice. Users should not have to hunt for IP/port in Plexamp settings unless discovery fails.

**Independent Test**: With Plex authenticated and Plexamp running on the LAN with remote control enabled, open the output selector without any prior manual configuration. At least one Plexamp entry appears within 10 seconds. Selecting it allows Story 1's play test to succeed.

**Acceptance Scenarios**:

1. **Given** the user is signed into Plex and Plexamp on the LAN has remote control enabled, **When** the user opens the output selector, **Then** available Plexamp instances appear within 10 seconds with distinct, recognizable names.
2. **Given** multiple Plexamp instances are on the network, **When** the list is shown, **Then** each instance is listed separately so the user can choose the correct room or device.
3. **Given** no Plexamp instance is reachable or none has remote control enabled, **When** the user opens the output selector, **Then** only "This device" is available as a playable output and a short explanation tells the user how to enable remote control on Plexamp (without requiring them to leave the app permanently stuck).
4. **Given** discovery temporarily fails (e.g., Plexamp was sleeping), **When** the user taps "Refresh" in the output selector, **Then** the list updates within 10 seconds to reflect currently reachable players.

---

### User Story 3 - Now Playing stays in sync with Plexamp (Priority: P2)

As a user controlling Plexamp from this application, I want the Now Playing view to show what is actually playing on Plexamp—including position, pause state, and queue highlight—so I trust the controls and know which track is on my speakers.

**Why this priority**: Remote playback without accurate UI state feels broken (clicks seem to do nothing, wrong track shown). Sync is essential for daily use but can follow basic play/pause/skip in Story 1.

**Independent Test**: With Plexamp as output, play a track and observe the Now Playing view for 30 seconds: title/artist/album match Plexamp, play/pause icon matches audible state on Plexamp, elapsed time advances during play and freezes on pause. Skip to next track and confirm the view updates within 3 seconds.

**Acceptance Scenarios**:

1. **Given** Plexamp is playing a track started from this app, **When** the user views Now Playing, **Then** displayed metadata matches what Plexamp is playing.
2. **Given** the user pauses from this application while Plexamp is output, **When** pause completes, **Then** the Now Playing play/pause control shows "play" and elapsed time stops advancing.
3. **Given** the user pauses or skips directly on the Plexamp device, **When** within 5 seconds, **Then** this application's Now Playing view updates to reflect Plexamp's actual state (bi-directional sync for state initiated outside this app).
4. **Given** a queue is active in this application, **When** playback advances on Plexamp, **Then** the queue highlights the track Plexamp is actually playing.

---

### User Story 4 - Remember my preferred output (Priority: P3)

As a household listener who always uses the living-room Plexamp, I want this application to remember my last chosen playback output across sessions, so I do not re-select Plexamp every time I open the app.

**Why this priority**: Convenience for repeat use; not required for the first successful play.

**Independent Test**: Select a named Plexamp instance, close and reopen the application (or refresh). The output selector shows that instance still selected. Press play without changing output; audio starts on the same Plexamp.

**Acceptance Scenarios**:

1. **Given** the user previously selected a Plexamp instance, **When** they return to the application later, **Then** that output remains selected if it is still reachable.
2. **Given** the saved Plexamp instance is offline on return, **When** the user attempts to play, **Then** a clear message explains the player is unavailable and offers to switch to "This device" or pick another discovered player.

---

### Edge Cases

- Plexamp is discovered but remote control is disabled in Plexamp settings — instance does not appear as selectable, or appears with explanation that remote control must be enabled.
- User selects Plexamp then loses LAN connectivity mid-track — user sees a connection-lost message within 5 seconds; queue does not silently stall; user can retry or fall back to "This device".
- Plexamp plays content started from Plexamp itself (not this app) while this app has Plexamp selected as output — Now Playing reflects Plexamp state without fighting for control; new play actions from this app replace or queue per existing queue rules.
- User has Plexamp output selected but plays from permanent cache while Plex server is offline — behavior follows existing cache rules: if the track cannot be handed off to Plexamp without server reachability, user sees an actionable message and option to play locally on "This device".
- Multiple users on the same Plex account could theoretically control the same Plexamp — last command wins; no multi-user lock is required in v1.
- Very long queue handed to Plexamp — playback continues through the queue; if Plexamp rejects an item, user sees per-track skip behavior consistent with existing playback failure patterns.
- User switches Plex server/account in Settings — saved Plexamp output preference is cleared along with other connection-specific preferences.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST offer a playback output control that includes at least "This device" (local browser playback) and one entry per discoverable Plexamp instance on the user's network.
- **FR-002**: When "This device" is selected, play, pause, skip, seek, and volume behavior MUST match existing in-browser playback (no regression to current local player).
- **FR-003**: When a Plexamp instance is selected, every play action initiated from this application (library, album detail, queue, Now Playing) MUST start or advance playback on that Plexamp instance rather than on local browser audio.
- **FR-004**: The application MUST discover Plexamp instances available to the authenticated Plex account without requiring the user to enter IP addresses for the common case.
- **FR-005**: The application MUST allow the user to refresh the list of discoverable Plexamp instances on demand.
- **FR-006**: When Plexamp is the active output, transport controls in this application (play, pause, next, previous, and seek where supported by the remote player) MUST control Plexamp within 2 seconds under normal LAN conditions.
- **FR-007**: When Plexamp is the active output and the in-app queue advances, the application MUST send the next queued item to Plexamp so listening continues without a manual play press between tracks.
- **FR-008**: The Now Playing view MUST display track metadata and play/pause state that match Plexamp when Plexamp is the active output, updating within 5 seconds of changes whether initiated from this app or from Plexamp directly.
- **FR-009**: The application MUST persist the user's last selected playback output and restore it on next launch when that output is still reachable.
- **FR-010**: When the selected Plexamp instance is unreachable, the application MUST show a user-visible message within 5 seconds that names the problem (player offline, not on network, remote control disabled, or connection timeout) and offers at least one recovery step (retry, refresh list, switch to "This device", or open Plex settings help).
- **FR-011**: When a play or control command to Plexamp fails, the application MUST NOT fail silently; messages MUST identify the affected track where applicable and follow the same failure categories users already expect (connection, authentication, track missing, player unavailable).
- **FR-012**: Plexamp instances shown in the output list MUST be identifiable by a stable display name so users can distinguish living room vs office vs phone dock.
- **FR-013**: Switching output from Plexamp to "This device" MUST stop sending new remote commands to Plexamp; any in-flight play on Plexamp may continue until the user pauses or stops from either interface unless the user explicitly chooses "Stop remote playback" when switching (if offered).
- **FR-014**: When the user changes Plex server or Plex account, the application MUST clear saved Plexamp output preference as part of connection reset behavior consistent with other Plex settings.
- **FR-015**: Listening initiated on Plexamp through this application MUST remain eligible for existing Plex play-history and in-app statistics behaviors where those features already depend on Plex-sourced plays, without double-counting the same listen on both browser and Plexamp.

### Key Entities

- **Playback Output**: The user's chosen destination for audio—local browser or a specific Plexamp instance. Includes display name, reachability status, and whether it is currently selected.
- **Network Player**: A Plexamp (or Plexamp-class) instance visible to the user's Plex account that accepts remote playback commands on the LAN. Distinguished by name and stable identity within the account.
- **Remote Playback Session**: The active relationship between this application's queue/Now Playing state and the selected Network Player—what is playing, paused, or queued on that device.
- **Output Discovery Result**: The outcome of scanning for players—available instances, empty list with reason, or error suitable for user messaging.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In testing with a reachable Plexamp on the same network, 95% of play actions with Plexamp selected result in audible playback on that device within 5 seconds.
- **SC-002**: 0% of failed remote play attempts leave the user with silent failure—every failure shows an explanatory message within 5 seconds.
- **SC-003**: When Plexamp is the active output, transport control actions (pause, resume, next, previous) succeed and update Now Playing within 2 seconds in 95% of attempts under normal LAN conditions.
- **SC-004**: After selecting Plexamp once, returning users find their last output still selected in 100% of sessions where that player is online (preference persistence).
- **SC-005**: At least 90% of test users can correctly identify which device will play music after reading the output selector label, without trial-and-error play.
- **SC-006**: When the user runs a 3-track queue with Plexamp as output, all three tracks play through on Plexamp without manual re-press between tracks in 95% of test runs.
- **SC-007**: Now Playing metadata and play/pause indicator match Plexamp's actual state in 100% of observed transitions during a 10-minute listening session initiated from this app.

## Assumptions

- The user has already completed Plex authentication and library access (features 001/002); this feature adds output selection on top of existing browse and queue flows.
- "Plexamp instance on the same network" means a Plexamp installation on the local LAN that the user's Plex account can see and remote-control—the same class of players Plexamp itself lists in its player selector.
- Plexamp remote control is enabled by the user in Plexamp settings; the application cannot force-enable it.
- Local browser playback ("This device") remains the default output for new users and when no Plexamp is available.
- Discovery uses the authenticated Plex account's view of available players; manual entry of host/port is out of scope for v1 unless discovery repeatedly fails (documented as future enhancement only in planning, not required here).
- Volume control on Plexamp may be limited by what the remote player exposes; if remote volume is unsupported, volume slider affects only local output and is hidden or disabled when Plexamp is selected.
- Multi-room simultaneous play (same track on browser and Plexamp at once) is out of scope; exactly one active output at a time.
- Features that report plays to Plex or last.fm follow their existing rules: plays are attributed to the listening experience the user actually had (remote on Plexamp vs local), without duplicate scrobbles for a single user action.
- Mobile browsers on the same Wi‑Fi as Plexamp are in scope to the same extent as desktop; installing Plexamp on the phone itself is a valid "network player" when remote control is on.
- Linear project details beyond the title were unavailable during specification; requirements above align with Plexamp's documented player-selector and remote-control behavior and with this product's existing Plex music player scope.
