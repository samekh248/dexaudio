# Feature Specification: Play Music on Plexamp (Same Network)

**Feature Branch**: `024-plexamp-network-playback`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description (from Linear project [Play music on a Plexamp instance on the same network](https://linear.app/audiodex/project/play-music-on-a-plexamp-instance-on-the-same-network-cfce178093c0/overview)): "Play music on a Plexamp instance on the same network"

## Clarifications

### Session 2026-06-03

- Q: When switching playback output from Plexamp to "This device", should Plexamp keep playing or stop? → A: Stop immediately — switching to "This device" always stops playback on the Plexamp instance.
- Q: Which network players should appear in the output list? → A: All Plex music players — any Plex client on the LAN that accepts music remote control (Plexamp, Plex Web, HTPC, etc.), not Plexamp-only.
- Q: How is the in-app queue sent to the remote player? → A: Replace remote queue — the network player's queue is built and kept in sync with the in-app queue on every change (add, reorder, remove).
- Q: Who reports plays to Plex when a network player is the output? → A: Remote player only — no DexAudio Plex playback reporting while a network player is output; the remote player's Plex session is authoritative.
- Q: Should last.fm scrobble when a network player is the output? → A: Scrobble from DexAudio — last.fm scrobbles still apply for sessions started from this app while a network player is output, per existing threshold rules.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a network player as where music plays (Priority: P1)

As a listener who runs Plex music on another device on my home network (Plexamp, Plex Web on a desktop, HTPC, etc.), I want to pick that Plex client as my playback output in this application, so that when I browse my library and press play here, the music actually comes out of the speakers connected to that device—not only from this browser tab.

**Why this priority**: This is the core outcome of the feature. Without a clear way to select a remote Plex music player as the output and have play actions reach it, the feature delivers no value. It mirrors the familiar Plex "player selector" mental model users already know from first-party Plex apps.

**Independent Test**: With Plex connected, at least one eligible Plex music player on the LAN with remote control enabled, and the user has selected that player as the active output, click play on any album or track. Within a few seconds, audio is audible on the remote device (verified on that device), while this application's Now Playing view shows the same track as active.

**Acceptance Scenarios**:

1. **Given** the user is connected to Plex and at least one eligible Plex music player is available on the network, **When** the user opens the playback output selector, **Then** they see "This device" (local browser playback) and each discoverable Plex music player listed by a human-readable name and player type (e.g., "Living Room — Plexamp", "Office PC — Plex Web").
2. **Given** the user selects a network player as the active output, **When** they press play on a track from the library or queue, **Then** playback starts on that player within 5 seconds and this application does not play audio locally unless the user switches output back to "This device".
3. **Given** a network player is the active output, **When** the user presses pause, resume, next, or previous from this application, **Then** the selected player responds within 2 seconds and the Now Playing view reflects the new state.
4. **Given** a network player is the active output and a multi-track queue exists in this application, **When** the current track ends, **Then** the next queued track begins on that player without requiring the user to press play again, because the remote player's queue mirrors the in-app queue.
5. **Given** a network player is the active output, **When** the user adds, removes, or reorders items in the in-app queue, **Then** the network player's queue is updated to match within 5 seconds without interrupting the currently playing track unless the user removed or skipped past the active item.
6. **Given** the user switches the active output from a network player back to "This device", **When** the switch completes, **Then** playback on that network player stops within 2 seconds, the player receives no further remote commands from this app, and subsequent play actions use browser audio only.
7. **Given** a network player was playing when the user switched to "This device", **When** they press play on a track, **Then** audio plays through the browser as today (existing local playback behavior) with no audible output continuing on the remote player.

---

### User Story 2 - Discover Plex music players on the network (Priority: P1)

As a user with one or more Plex music clients at home, I want this application to show me which Plex players I can control without manually typing IP addresses, so that setup is quick and I do not need networking expertise.

**Why this priority**: Discovery is required for Story 1 to work in practice. Users should not have to hunt for IP/port in player settings unless discovery fails.

**Independent Test**: With Plex authenticated and at least one Plex music player on the LAN with remote control enabled, open the output selector without any prior manual configuration. At least one player entry appears within 10 seconds. Selecting it allows Story 1's play test to succeed.

**Acceptance Scenarios**:

1. **Given** the user is signed into Plex and at least one Plex music player on the LAN has remote control enabled, **When** the user opens the output selector, **Then** all eligible Plex music players appear within 10 seconds with distinct, recognizable names and player types.
2. **Given** multiple Plex music players are on the network (e.g., Plexamp and Plex Web), **When** the list is shown, **Then** each player is listed separately so the user can choose the correct room or device.
3. **Given** no Plex music player is reachable or none has remote control enabled, **When** the user opens the output selector, **Then** only "This device" is available as a playable output and a short explanation tells the user how to enable remote control on their Plex player (without requiring them to leave the app permanently stuck).
4. **Given** discovery temporarily fails (e.g., the player was sleeping), **When** the user taps "Refresh" in the output selector, **Then** the list updates within 10 seconds to reflect currently reachable players.
5. **Given** Plex clients that support only video (no music remote control) are visible to the account, **When** the output selector is shown, **Then** those clients are excluded from the list.

---

### User Story 3 - Now Playing stays in sync with the network player (Priority: P2)

As a user controlling a network player from this application, I want the Now Playing view to show what is actually playing on that device—including position, pause state, and queue highlight—so I trust the controls and know which track is on my speakers.

**Why this priority**: Remote playback without accurate UI state feels broken (clicks seem to do nothing, wrong track shown). Sync is essential for daily use but can follow basic play/pause/skip in Story 1.

**Independent Test**: With a network player as output, play a track and observe the Now Playing view for 30 seconds: title/artist/album match the remote player, play/pause icon matches audible state on that device, elapsed time advances during play and freezes on pause. Skip to next track and confirm the view updates within 3 seconds.

**Acceptance Scenarios**:

1. **Given** a network player is playing a track started from this app, **When** the user views Now Playing, **Then** displayed metadata matches what the network player is playing.
2. **Given** the user pauses from this application while a network player is the output, **When** pause completes, **Then** the Now Playing play/pause control shows "play" and elapsed time stops advancing.
3. **Given** the user pauses or skips directly on the network player device or app, **When** within 5 seconds, **Then** this application's Now Playing view updates to reflect the player's actual state (bi-directional sync for state initiated outside this app).
4. **Given** a queue is active in this application, **When** playback advances on the network player, **Then** the queue highlights the track the network player is actually playing.

---

### User Story 4 - Remember my preferred output (Priority: P3)

As a household listener who always uses the living-room Plexamp (or another fixed Plex player), I want this application to remember my last chosen playback output across sessions, so I do not re-select the player every time I open the app.

**Why this priority**: Convenience for repeat use; not required for the first successful play.

**Independent Test**: Select a named network player, close and reopen the application (or refresh). The output selector shows that player still selected. Press play without changing output; audio starts on the same device.

**Acceptance Scenarios**:

1. **Given** the user previously selected a network player, **When** they return to the application later, **Then** that output remains selected if it is still reachable.
2. **Given** the saved network player is offline on return, **When** the user attempts to play, **Then** a clear message explains the player is unavailable and offers to switch to "This device" or pick another discovered player.

---

### Edge Cases

- A Plex music player is discovered but remote control is disabled in that player's settings — it does not appear as selectable, or appears with explanation that remote control must be enabled.
- User selects a network player then loses LAN connectivity mid-track — user sees a connection-lost message within 5 seconds; queue does not silently stall; user can retry or fall back to "This device".
- A network player plays content started outside this app while this app has that player selected as output — the next play or queue edit from this app re-syncs the remote queue to match the in-app queue; until then, Now Playing reflects the player's actual state.
- User reorders the in-app queue while a track is playing on a network player — remote queue is rebuilt to match the new order within 5 seconds; playback continues on the current track unless that item was removed or skipped past.
- Remote player rejects queue sync (player limitation or error) — user sees a clear message; in-app queue remains authoritative and the app retries sync or falls back to track-by-track play for that session per failure messaging rules.
- User has a network player selected but plays from permanent cache while Plex server is offline — behavior follows existing cache rules: if the track cannot be handed off to the remote player without server reachability, user sees an actionable message and option to play locally on "This device".
- Multiple users on the same Plex account could theoretically control the same network player — last command wins; no multi-user lock is required in v1.
- Very long queue synced to a network player — full in-app queue is pushed on sync; if the player caps queue length, user is notified which items could not be synced and the in-app queue remains complete for local fallback.
- User switches Plex server/account in Settings — saved network player output preference is cleared along with other connection-specific preferences.
- User switches from a network player to "This device" while music is playing on the remote player — remote playback stops within 2 seconds; Now Playing reflects stopped/idle state on the remote output unless the user starts local playback.
- A Plex client supports music but has limited remote-control capabilities compared to Plexamp — transport controls degrade gracefully (e.g., seek disabled) with no silent failure; unsupported actions show a brief explanation.
- User checks Plex activity after listening on a network player — the play appears under the remote player (e.g., Plexamp), not as a duplicate DexAudio timeline entry for the same listen.
- User has last.fm connected and listens via a network player — scrobbles submit from DexAudio when thresholds are met, even though Plex timeline reporting is disabled for that session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST offer a playback output control that includes at least "This device" (local browser playback) and one entry per discoverable Plex music player on the user's network that accepts music remote control.
- **FR-002**: When "This device" is selected, play, pause, skip, seek, and volume behavior MUST match existing in-browser playback (no regression to current local player).
- **FR-003**: When a network player is selected, every play action initiated from this application (library, album detail, queue, Now Playing) MUST start or advance playback on that player rather than on local browser audio.
- **FR-004**: The application MUST discover all eligible Plex music players available to the authenticated Plex account without requiring the user to enter IP addresses for the common case.
- **FR-005**: The application MUST allow the user to refresh the list of discoverable network players on demand.
- **FR-006**: When a network player is the active output, transport controls in this application (play, pause, next, previous, and seek where supported by that player) MUST control the selected player within 2 seconds under normal LAN conditions.
- **FR-007**: When a network player is the active output, the application MUST keep that player's playback queue in sync with the in-app queue—on initial play and whenever the user adds, removes, or reorders queue items—so auto-advance between tracks does not require a manual play press per track. Sync MUST complete within 5 seconds of an in-app queue change under normal LAN conditions and MUST NOT interrupt the currently playing track except when the active item is removed or the user skips past it.
- **FR-008**: The Now Playing view MUST display track metadata and play/pause state that match the active network player, updating within 5 seconds of changes whether initiated from this app or from the player directly.
- **FR-009**: The application MUST persist the user's last selected playback output and restore it on next launch when that output is still reachable.
- **FR-010**: When the selected network player is unreachable, the application MUST show a user-visible message within 5 seconds that names the problem (player offline, not on network, remote control disabled, or connection timeout) and offers at least one recovery step (retry, refresh list, switch to "This device", or open Plex settings help).
- **FR-011**: When a play or control command to a network player fails, the application MUST NOT fail silently; messages MUST identify the affected track where applicable and follow the same failure categories users already expect (connection, authentication, track missing, player unavailable).
- **FR-012**: Network players shown in the output list MUST be identifiable by a stable display name and player type label so users can distinguish living room Plexamp vs office Plex Web vs other clients.
- **FR-013**: When the user switches playback output from a network player to "This device", the application MUST stop active playback on that player within 2 seconds and MUST NOT send further remote commands to it until the user selects it again as the active output.
- **FR-014**: When the user changes Plex server or Plex account, the application MUST clear saved network player output preference as part of connection reset behavior consistent with other Plex settings.
- **FR-015**: When a network player is the active output, the application MUST NOT send DexAudio Plex playback timeline reports (feature 015) for that session; the selected network player's own Plex session is authoritative for Plex play history and activity views.
- **FR-017**: When the user switches back to "This device", DexAudio Plex playback reporting MUST resume for subsequent local playback per existing feature 015 rules.
- **FR-018**: In-app Top 10 and other statistics that read Plex play history MUST reflect listens recorded on the network player when the user played from this app with that output selected (same as plays initiated on other Plex clients), without requiring a separate DexAudio timeline entry for the same listen.
- **FR-019**: When last.fm is connected and a network player is the active output, the application MUST still scrobble tracks the user listens to through this app (including queue auto-advance) using existing last.fm threshold and retry rules; remote output does not disable scrobbling.
- **FR-020**: last.fm scrobbles for network-player sessions MUST NOT duplicate entries already submitted for the same play event if the user switches output mid-track; one scrobble per completed listen threshold.
- **FR-016**: The output list MUST include only Plex clients that support music remote control; video-only or non-controllable clients MUST be excluded.

### Key Entities

- **Playback Output**: The user's chosen destination for audio—local browser or a specific network player. Includes display name, player type, reachability status, and whether it is currently selected.
- **Network Player**: Any Plex client on the LAN visible to the user's Plex account that accepts music remote-control commands (e.g., Plexamp, Plex Web, HTPC). Distinguished by name, player type, and stable identity within the account. Video-only clients are not network players for this feature.
- **Remote Playback Session**: The active relationship between this application's queue/Now Playing state and the selected Network Player—what is playing, paused, or queued on that device. Includes last successful queue sync timestamp and any sync error state.
- **Queue Sync**: The operation that replaces or updates the network player's queue to mirror the in-app queue order and contents.
- **Output Discovery Result**: The outcome of scanning for players—available instances, empty list with reason, or error suitable for user messaging.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In testing with a reachable Plex music player on the same network, 95% of play actions with a network player selected result in audible playback on that device within 5 seconds.
- **SC-002**: 0% of failed remote play attempts leave the user with silent failure—every failure shows an explanatory message within 5 seconds.
- **SC-003**: When a network player is the active output, transport control actions (pause, resume, next, previous) succeed and update Now Playing within 2 seconds in 95% of attempts under normal LAN conditions.
- **SC-004**: After selecting a network player once, returning users find their last output still selected in 100% of sessions where that player is online (preference persistence).
- **SC-005**: At least 90% of test users can correctly identify which device will play music after reading the output selector label, without trial-and-error play.
- **SC-006**: When the user runs a 3-track queue with a network player as output, all three tracks play through on that player without manual re-press between tracks in 95% of test runs, with the remote queue synced before or at the start of playback.
- **SC-010**: When the user reorders a 5-item queue during playback on a network player, the remote queue matches the new order within 5 seconds in 95% of test runs without stopping the current track.
- **SC-007**: Now Playing metadata and play/pause indicator match the network player's actual state in 100% of observed transitions during a 10-minute listening session initiated from this app.
- **SC-008**: When the user switches from a network player to "This device" during active playback, the remote player stops within 2 seconds in 100% of test runs on a reachable player.
- **SC-009**: When both Plexamp and at least one other Plex music player are on the network, all eligible players appear in the output list within 10 seconds in 100% of discovery test runs.
- **SC-011**: When last.fm is connected and the user completes a qualifying listen on a network player started from this app, a scrobble is submitted within the existing 24-hour retry window in 95% of test runs, with no duplicate scrobble for the same play event.

## Assumptions

- The user has already completed Plex authentication and library access (features 001/002); this feature adds output selection on top of existing browse and queue flows.
- Primary use case remains Plexamp on the LAN (per Linear project title); v1 also supports all other Plex music players that accept remote control, discovered the same way Plex lists controllable clients.
- Remote control must be enabled by the user on each Plex player; the application cannot force-enable it.
- Local browser playback ("This device") remains the default output for new users and when no network player is available.
- Discovery uses the authenticated Plex account's view of available players; manual entry of host/port is out of scope for v1 unless discovery repeatedly fails (documented as future enhancement only in planning, not required here).
- Volume control on a network player may be limited by what that client exposes; if remote volume is unsupported, volume slider affects only local output and is hidden or disabled when a network player is selected.
- Multi-room simultaneous play (same track on browser and a network player at once) is out of scope; exactly one active output at a time.
- Plex playback reporting (feature 015) is active only when "This device" is the output; remote network players report to Plex through their own client sessions.
- last.fm scrobbling remains active when a network player is the output, independent of Plex timeline reporting; Plex history and last.fm use different reporting paths.
- Mobile browsers on the same Wi‑Fi as a network player are in scope to the same extent as desktop; a Plex music client on the phone itself is a valid network player when remote control is on.
- Linear project details beyond the title were unavailable during specification; requirements above align with Plexamp's documented player-selector and remote-control behavior and with this product's existing Plex music player scope.
