# Feature Specification: Queue and Now Playing Persistence

**Feature Branch**: `010-queue-playback-cache`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "The queue and currently playing should be cached between app loads. Upon reload though, the play is always stopped."

## Clarifications

### Session 2026-05-20

- Q: When the active music library changes, what should happen to the persisted queue and now-playing session? → A: Clear persisted queue and now-playing session when the active library changes.
- Q: After reload, if the user had a queue but never pressed play, what should "currently playing" look like? → A: Restore queue only; no track selected as current (user must pick one).
- Q: After reload with a restored non-empty queue, where should the user land? → A: Stay on the current route (or app default); restored queue visible in queue UI / player chrome only.
- Q: Should skipped-track markers persist across reload? → A: No — reset skipped markers on reload; only queue items, current index, and position persist.
- Q: When restore fails due to corrupt/unreadable cache, should the user be notified? → A: Non-blocking notice (e.g., toast) that the previous session could not be restored.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Queue survives app reload (Priority: P1)

As a listener building a session, I want my playback queue to remain intact after I close the tab, refresh the page, or reopen the app later, so that I do not have to rebuild the queue from scratch every time I return.

**Why this priority**: The queue is the user's intentional listening plan. Losing it on every reload breaks continuity and is the primary pain this feature addresses.

**Independent Test**: Add several tracks to the queue (via album play, add-to-queue, or similar), reload the app, and confirm the same tracks appear in the same order without re-adding them manually.

**Acceptance Scenarios**:

1. **Given** the user has a non-empty queue with at least three tracks, **When** they reload the app, **Then** the queue lists the same tracks in the same order as before reload.
2. **Given** the user reordered or removed items in the queue before reload, **When** they reload the app, **Then** the queue reflects the latest order and membership (removed items stay removed, reordered items stay reordered).
3. **Given** the user cleared the queue before reload, **When** they reload the app, **Then** the queue is empty.
4. **Given** the user had both user-added and automatically added similar tracks in the queue, **When** they reload the app, **Then** all persisted queue entries are restored with the same distinction between user-added and auto-added items where the app supports that today.
5. **Given** the user built a queue but never started playback, **When** they reload the app, **Then** the queue restores with no track marked as currently playing until the user selects one.

---

### User Story 2 - Currently playing context survives reload but audio stays stopped (Priority: P1)

As a listener who was mid-session, I want the app to remember which track was current and where I was in that track after reload, but I do not want audio to start automatically, so that I stay in control and avoid surprise sound on page load.

**Why this priority**: Restoring "what I was listening to" without auto-play matches explicit user intent and browser expectations; pairing this with queue persistence completes the session-restore experience.

**Independent Test**: Start playback on a track, let it play partway through, reload the app, and verify the Now Playing context shows the same track and position while no audio plays until the user explicitly presses play.

**Acceptance Scenarios**:

1. **Given** a track is currently selected in the queue at index N, **When** the user reloads the app, **Then** the current queue position is still index N and the Now Playing view (or equivalent primary player UI) identifies that same track as current.
2. **Given** playback had progressed to position P seconds within the current track before reload, **When** the user reloads the app, **Then** the displayed elapsed position is P (within 2 seconds tolerance) and no audio is audible until the user initiates play.
3. **Given** the user was actively playing audio before reload, **When** the app finishes loading after reload, **Then** playback state is stopped or paused (not playing), the play control offers to start playback, and pressing play resumes from the restored position within 2 seconds.
4. **Given** the user was already paused before reload, **When** they reload the app, **Then** the app remains paused at the same track and position with no automatic audio start.
5. **Given** the user reloads the app, **When** the restored session is shown, **Then** no track begins playing without an explicit user action (click, tap, or keyboard activation on a play control).
6. **Given** the user reloads while on any app route, **When** a session restores, **Then** they remain on that route (or the app default) and see restored state in queue/player UI without being auto-navigated to Now Playing.

---

### User Story 3 - Restored session handles missing or invalid tracks (Priority: P2)

As a listener returning after reload, I want the app to recover gracefully when a cached track is no longer available, so that a stale queue does not block me from continuing to listen.

**Why this priority**: Persistence introduces failure modes (library changes, auth changes, expired URLs). Clear recovery prevents a broken empty player after reload.

**Independent Test**: Persist a queue, remove or invalidate one cached track on the server (or simulate unavailable track), reload, and verify the user sees a clear message and can skip or continue with remaining tracks.

**Acceptance Scenarios**:

1. **Given** a persisted queue contains a track that is no longer available from the music source, **When** the user reloads and attempts to play, **Then** a clear message explains the track is unavailable and offers skip or play-next behavior consistent with existing playback failure handling.
2. **Given** persisted data is corrupted or unreadable, **When** the app loads, **Then** the app starts with an empty queue and stopped playback without crashing, and a non-blocking notice informs the user that the previous session could not be restored.
3. **Given** the user signs out or disconnects the music source, **When** the session ends, **Then** persisted queue and now-playing cache for that session are cleared so the next user or re-login does not see another user's queue.

---

### Edge Cases

- What happens when device storage is full or persistence is blocked (private browsing)? App runs without persistence for that session and does not error fatally.
- What happens when the queue is very large (e.g., full album queue)? Persistence completes without blocking app startup beyond acceptable load time (see success criteria).
- What happens when the user opens two tabs? Each tab may read/write the same cached session; last write wins unless a future multi-tab feature defines otherwise (see Assumptions).
- What happens when only queue changes but the user never played audio? Queue restores with no current track selected; elapsed position is not restored until the user selects a track and starts playback.
- What happens on first visit with no prior cache? Empty queue, nothing playing, same as today.
- What happens when the user switches to a different Plex music library? Persisted queue and now-playing session for the previous library are cleared immediately; the app starts with an empty queue and stopped playback for the new library context.
- What happens to auto-skip / skipped-track markers on reload? Skipped markers are not restored; auto-advance logic starts fresh on the next playback attempt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist the ordered playback queue (track identity and queue metadata needed to rebuild the queue) across app reloads on the same device and browser profile.
- **FR-002**: System MUST persist which queue index is current (the "now playing" track selection) across app reloads when the user has started or selected a current track in the session; if the user never started playback, no current track is persisted.
- **FR-003**: System MUST persist the elapsed playback position within the current track across app reloads only when a current track exists in the persisted session.
- **FR-004**: System MUST NOT start audio playback automatically on app load after reload; playback MUST remain stopped until the user explicitly starts it.
- **FR-005**: System MUST update persisted queue and now-playing data whenever the user changes queue membership, order, current index, or playback position in ways the app already reflects in live session state.
- **FR-006**: System MUST restore persisted queue and now-playing context during initial app load without requiring the user to re-select tracks manually, and MUST NOT change the user's route solely because a session was restored.
- **FR-013**: System MUST surface restored queue and current-track state in existing queue and player UI (e.g., queue panel, player chrome) without auto-navigating to Now Playing on load.
- **FR-007**: System MUST present restored playback as paused or stopped (play affordance available, no audible output) immediately after load completes.
- **FR-008**: When the user presses play after reload, system MUST begin playback from the restored current track and restored position unless that track is unplayable.
- **FR-009**: System MUST clear persisted queue and now-playing cache when the user signs out or disconnects the connected music source account.
- **FR-012**: System MUST clear persisted queue and now-playing cache when the user changes the active music library to a different library.
- **FR-010**: System MUST handle unavailable, invalid, or corrupt persisted entries without crashing and MUST offer recovery paths (skip, clear session, or start fresh) consistent with existing playback error patterns.
- **FR-015**: When persisted data is corrupt or unreadable on load, system MUST show a non-blocking notice that the previous playback session could not be restored, then continue with an empty queue and stopped playback.
- **FR-011**: System MUST NOT persist audio blobs or large binary media in device cache for this feature; only identifiers and session metadata required to re-resolve tracks from the music source.
- **FR-014**: System MUST NOT persist skipped-track markers or other transient auto-advance session flags; these reset on reload.

### Key Entities

- **Persisted playback session**: Snapshot of queue items, current index, elapsed position within current track, and timestamp of last save; scoped to device/browser profile and a single active music library identifier. Invalid when the active library changes.
- **Queue item (persisted)**: Reference to a track the app can re-fetch (stable track identifier, display fields for UI, source type user vs auto if applicable). Transient skip markers are not part of persisted items.
- **Current playback context**: Optional active queue index plus elapsed position when the user had started or selected playback; absent when only the queue was built without play. Playback running flag is always false immediately after reload regardless of pre-reload state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In user testing, 95% of reload attempts with a non-empty queue restore the same track order without manual re-entry.
- **SC-002**: In user testing, 95% of reload attempts restore the correct current track and elapsed position within 2 seconds of the pre-reload value.
- **SC-003**: Zero automatic audio starts occur on app load in acceptance testing across reload, hard refresh, and reopen-browser scenarios (100% of cases remain silent until explicit play).
- **SC-004**: Median time from app load start to visible restored queue and current track in UI is under 3 seconds on a typical desktop session with a queue of up to 50 tracks.
- **SC-005**: Support requests or user reports of "lost my queue on refresh" decrease measurably after release (qualitative follow-up within one release cycle).

## Assumptions

- Persistence uses device-local storage on the client; no server-side queue sync is required for this feature.
- Track identifiers stored in the queue today remain valid for re-fetching track metadata and playback URLs after reload while the same Plex library and auth remain active.
- Auto-resume on reload is explicitly out of scope; users who want continuous listening press play once after load.
- Multi-tab coordination remains out of scope (per prior playback features); concurrent tabs may overwrite the same cached session with last-writer semantics.
- Volume, theme, gapless, and other playback preferences continue to use existing preference persistence; this feature adds queue and now-playing session persistence only.
- Clearing auth disconnects the music source and must clear playback session cache to avoid cross-account leakage.
- Changing the active music library clears playback session cache (same outcome as starting fresh in the new library).
- Route/navigation is unchanged on reload; users open Now Playing manually when they want the full player view.
