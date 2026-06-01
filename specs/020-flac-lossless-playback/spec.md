# Feature Specification: Lossless FLAC Playback

**Feature Branch**: `020-flac-lossless-playback`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Add support for lossless FLAC playback. Make this a configurable setting. If there are bandwidth, browser issues, etc., roll back to the current transcoding method."

## Clarifications

### Session 2026-05-31

- Q: Which lossless source formats should this feature cover in v1? → A: FLAC + ALAC (other lossless formats keep using transcoding)
- Q: When a track falls back from lossless to transcoding mid-playback, what happens to playback position? → A: Resume the transcoded stream at the listener's current position
- Q: What decisively triggers a bandwidth/stall-related fallback from lossless to transcoding? → A: Reuse the existing stall-recovery threshold — if a lossless stream stalls beyond the current recovery window (or errors), fall back (no separate bandwidth pre-flight check)
- Q: What should the default state of the lossless playback setting be? → A: Default ON — lossless is attempted by default for everyone, with automatic fallback to transcoding
- Q: When lossless is enabled, what quality should newly pre-cached and pinned (offline) tracks be stored as? → A: Store lossless for supported formats; rely on existing cache-cap prompts for storage; playback fallback still applies

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hear FLAC tracks at original lossless quality (Priority: P1)

A listener with a high-quality FLAC music library wants to hear those tracks in their original lossless quality rather than a compressed version. Today, FLAC tracks are always converted to a lower-quality compressed stream before playback. The listener turns on a "lossless playback" option and, from then on, FLAC tracks play back in their original, unaltered quality.

**Why this priority**: This is the core value of the feature. Without it, the listener cannot experience the audio fidelity their library offers. It is the minimum viable slice — delivering lossless audio for capable listeners.

**Independent Test**: Enable the lossless setting, play a FLAC track on a device/browser that can play lossless audio with adequate bandwidth, and confirm the audio delivered is the original lossless file (not the compressed/transcoded version) by verifying the playback-quality indicator and audio data source.

**Acceptance Scenarios**:

1. **Given** the lossless setting is enabled and the listener is on a capable browser with adequate bandwidth, **When** they play a FLAC track, **Then** the original lossless audio is delivered and the player indicates lossless quality.
2. **Given** the lossless setting is disabled, **When** the listener plays a FLAC track, **Then** the track is delivered using the existing transcoded (compressed) method, preserving today's behavior.
3. **Given** the listener plays a non-FLAC track (e.g., MP3) with lossless enabled, **When** playback starts, **Then** the track plays using its normal method and the lossless setting has no adverse effect.

---

### User Story 2 - Automatic fallback to transcoding when lossless can't play (Priority: P1)

A listener has lossless playback enabled, but conditions sometimes make lossless delivery impractical — their browser can't decode FLAC, their connection is too slow to keep up, or the lossless stream fails or stalls. The system automatically rolls back to the existing transcoding method for that track so playback continues without interruption or a broken experience.

**Why this priority**: Lossless playback is only safe to offer if it degrades gracefully. Without reliable fallback, enabling the setting could leave listeners with silent, stuttering, or failed playback. This protects the listening experience and is required for the feature to ship.

**Independent Test**: With lossless enabled, simulate each failure condition (unsupported browser, constrained bandwidth, lossless stream error/stall) and confirm playback automatically continues using the transcoded method for the affected track.

**Acceptance Scenarios**:

1. **Given** lossless is enabled but the current browser cannot decode lossless audio, **When** the listener plays a FLAC track, **Then** the system delivers the transcoded version instead and playback succeeds.
2. **Given** lossless is enabled and a FLAC track begins lossless playback, **When** the lossless stream fails to load or repeatedly stalls due to bandwidth, **Then** the system falls back to the transcoded version and resumes playback as seamlessly as possible.
3. **Given** a track has fallen back to transcoding, **When** the listener plays a subsequent FLAC track under improved conditions, **Then** the system attempts lossless again rather than permanently staying in transcoded mode.

---

### User Story 3 - Understand and control playback quality (Priority: P2)

A listener wants to know whether the current track is playing in lossless or transcoded quality, and wants their lossless preference remembered across sessions so they don't have to reconfigure it each time.

**Why this priority**: Transparency builds trust in the feature and helps listeners diagnose why a track may not be lossless. Persisting the preference is expected behavior for a setting but is not required to demonstrate the core lossless experience.

**Independent Test**: Toggle the setting, reload/reopen the app, and confirm the preference persists; play tracks under different conditions and confirm the indicator accurately reflects lossless vs transcoded delivery.

**Acceptance Scenarios**:

1. **Given** the listener has enabled lossless playback, **When** they reopen the application later, **Then** the lossless setting remains enabled.
2. **Given** a track is playing, **When** the listener views the now-playing information, **Then** an indicator shows whether the audio is lossless or transcoded.
3. **Given** a FLAC track fell back to transcoding, **When** the listener views the now-playing information, **Then** the indicator reflects transcoded quality (not lossless).

---

### Edge Cases

- **Unsupported browser**: When the listener's browser cannot decode lossless audio at all, lossless attempts should not waste bandwidth repeatedly; the system should prefer transcoding for that environment.
- **Mid-track degradation**: If conditions deteriorate after lossless playback has started (e.g., bandwidth drops), the system recovers by switching that track to transcoding and resuming at the listener's current position, without restarting the track.
- **Seeking within a lossless track**: Jumping to a new position must continue to work in lossless mode, or trigger fallback if the seek cannot be served.
- **Cached tracks**: A track already cached for offline/queue playback plays at its stored quality; the lossless setting governs new fetches rather than retroactively re-fetching cached audio. When lossless is enabled, new pre-cache/pin downloads of supported formats are stored losslessly, and the existing cache-capacity prompts manage the larger storage footprint.
- **Gapless/crossfade transitions**: Switching quality between consecutive tracks should not break gapless or crossfade transitions.
- **Non-FLAC formats**: The setting applies to lossless source formats (primarily FLAC); other formats continue using their existing playback method.
- **Toggling mid-playback**: Changing the setting while a track is playing should take effect on the next track load at the latest, without crashing the current playback.
- **Repeated fallback**: A track that consistently fails lossless should not loop indefinitely between lossless and transcoded attempts; fallback for that attempt should be decisive.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a user-configurable setting that enables or disables lossless FLAC playback.
- **FR-002**: The lossless setting MUST default to enabled, so lossless is attempted by default (with automatic fallback to transcoding) for users who take no action. Listeners who prefer the prior behavior can disable it.
- **FR-003**: System MUST persist the lossless setting across application sessions for the listener.
- **FR-004**: When lossless is enabled and conditions allow, System MUST deliver FLAC tracks in their original lossless quality rather than transcoding them.
- **FR-005**: When lossless is disabled, System MUST deliver FLAC tracks using the existing transcoding method, with no change to current behavior.
- **FR-006**: System MUST automatically fall back to the existing transcoding method for a track when lossless playback cannot be delivered, including at minimum: the browser cannot decode the lossless format, the lossless stream fails to load or errors, or the connection cannot sustain lossless playback. Bandwidth-related fallback MUST be triggered by the existing playback stall-recovery threshold — when a lossless stream stalls beyond the current recovery window (or errors), the system falls back — rather than a separate pre-flight bandwidth estimate.
- **FR-007**: Fallback MUST allow playback of the affected track to continue rather than ending in a failed or silent state. When fallback occurs after lossless playback has already started, the transcoded stream MUST resume at the listener's current playback position rather than restarting the track.
- **FR-008**: Fallback decisions MUST be scoped per track attempt and MUST NOT permanently disable lossless; subsequent eligible tracks SHOULD attempt lossless again when conditions allow.
- **FR-009**: System MUST avoid repeatedly retrying lossless for an environment that is known to be incapable of decoding lossless audio, to prevent wasted bandwidth and playback delays.
- **FR-010**: System MUST indicate to the listener whether the currently playing track is lossless or transcoded, and this indicator MUST reflect any fallback that occurred.
- **FR-011**: The setting MUST only affect supported lossless source formats (FLAC and ALAC for v1); all other formats (including other lossless formats such as WAV) MUST continue to use their existing playback method.
- **FR-012**: Changing the setting MUST NOT crash or corrupt in-progress playback; the new value MUST apply to subsequent track loads at the latest.
- **FR-013**: Seeking within a lossless track MUST continue to function, or trigger fallback for that track when the seek cannot be served losslessly.
- **FR-014**: Lossless playback and fallback MUST be compatible with existing playback features (queue, gapless/crossfade transitions, caching, and listening/scrobble reporting) without regressions.
- **FR-015**: When lossless is enabled, newly pre-cached (look-ahead) and pinned (offline) downloads of supported lossless formats MUST be stored in lossless quality, with the existing cache-capacity prompts governing storage limits. Playback-time fallback rules still apply to cached audio that the environment cannot decode.

### Key Entities *(include if feature involves data)*

- **Lossless Playback Preference**: The listener's on/off choice for lossless playback, persisted across sessions. Default: on.
- **Track Playback Quality**: The effective delivery quality for a given track during playback — lossless or transcoded — including the reason for any fallback (unsupported browser, stream error, bandwidth).
- **Playback Capability**: A determination of whether the current environment can play lossless audio, used to decide whether to attempt lossless or go straight to transcoding.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With lossless enabled on a capable environment with adequate bandwidth, 100% of FLAC tracks are delivered in their original lossless quality.
- **SC-002**: With lossless disabled, playback behavior is identical to the pre-feature experience (no measurable change) for 100% of tracks.
- **SC-003**: When a lossless attempt cannot succeed, 100% of affected tracks continue playing via transcoding, with no track ending in a failed/silent state attributable to the lossless attempt.
- **SC-004**: On a browser that cannot decode lossless audio, the listener still experiences uninterrupted playback, and lossless is not re-attempted wastefully for that environment.
- **SC-005**: The listener can correctly identify the current track's quality (lossless vs transcoded) from the now-playing information in at least 95% of cases.
- **SC-006**: The lossless preference is retained across application restarts in 100% of cases.
- **SC-007**: Time to first audio for a lossless track that ends up falling back does not exceed a typical transcoded start by more than a small, acceptable margin (so fallback feels responsive rather than stuck).

## Assumptions

- **Default on**: The lossless setting defaults to ON, so lossless is attempted by default for everyone, relying on automatic fallback to keep playback reliable. Listeners can disable it to force the prior transcoding-only behavior.
- **Supported lossless formats**: "Lossless" in this feature refers to FLAC and ALAC for v1. Other lossless formats (e.g., WAV) remain out of scope and continue to use transcoding.
- **Existing transcoding is the fallback**: The current transcoding method (compressed stream) is the established, reliable fallback path and remains unchanged.
- **Per-track, transient fallback**: Fallback applies to the current track attempt and does not silently turn off the user's setting; future tracks re-attempt lossless when viable.
- **Capability detection is best-effort**: Determining browser decode capability and "sufficient bandwidth" relies on best-effort signals (decode support checks, load failures, stalls). Exact thresholds are an implementation detail; the requirement is graceful, non-disruptive fallback.
- **Cached audio respects stored quality**: The setting governs new stream fetches and downloads; already-cached track audio is played as cached rather than re-downloaded to match the new setting. New pre-cache/pin downloads under an enabled setting are stored losslessly for supported formats.
- **Single global setting**: Lossless is a single application-wide preference, not a per-track or per-album override, for v1.
