# Feature Specification: Play Navigation Preference

**Feature Branch**: `013-play-navigation-preference`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "There should be a user setting for when the user selects something to play to either stay on the same page or to go to the now playing page."

## Clarifications

### Session 2026-05-29

- Q: When **Stay on current page** is selected and playback starts, should the app show explicit on-screen confirmation beyond audio and the header Now Playing indicator? → A: No extra feedback — audible playback and the header Now Playing indicator (visualizer while playing) are sufficient.
- Q: Should the preference apply only to enumerated flows (track, album, artist) or any play-now via the centralized hook? → A: Any play-now action routed through the centralized hook, including future entry points (e.g. search results).
- Q: When the app reloads and restores an active playback session, should the play-navigation preference cause a route change? → A: Never — session restore never changes route, regardless of preference.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose whether play actions change the page (Priority: P1)

A listener who browses albums or artists while building a mental queue wants to control whether choosing "play" takes them to the Now Playing page or keeps them on the page they are browsing. They open Settings → Playback, pick either **Go to Now Playing** or **Stay on current page**, and that choice applies the next time they start playback from a library action.

**Why this priority**: Without a persisted preference, users cannot opt out of the forced navigation that interrupts browsing. This is the core value of the feature.

**Independent Test**: Open Settings, change the play-navigation preference, reload the app, and confirm the saved choice is still selected. With **Stay on current page** enabled, trigger Play now on a track from an album page and confirm the URL and visible page remain the album view while audio starts. With **Go to Now Playing** enabled, the same action navigates to `/now-playing`.

**Acceptance Scenarios**:

1. **Given** the user opens Settings → Playback, **When** the section loads, **Then** a labeled control for play navigation behavior is visible with a short description of each option.
2. **Given** the user has never changed the setting, **When** they open Settings, **Then** **Go to Now Playing** is selected by default (preserving today's behavior).
3. **Given** the user selects **Stay on current page**, **When** they leave Settings and reload the app, **Then** **Stay on current page** remains selected.
4. **Given** the user selects **Go to Now Playing**, **When** they leave Settings and reload the app, **Then** **Go to Now Playing** remains selected.

---

### User Story 2 - Play-now actions respect the preference (Priority: P1)

When the user starts playback by selecting something to play (any action that replaces the queue and starts playback via the centralized play-now hook—currently track Play now, play album, and play artist, plus any future entry points such as search), the app either navigates to the Now Playing page or stays on the current page according to the saved preference. Playback itself always starts regardless of navigation choice.

**Why this priority**: The preference only matters if every primary "start playback" entry point honors it consistently.

**Independent Test**: With **Stay on current page**, use Play now on a track, play an album from the library grid, and play an artist from spotlight—confirm none of these change the route. With **Go to Now Playing**, repeat and confirm each navigates to `/now-playing` while playback starts.

**Acceptance Scenarios**:

1. **Given** **Stay on current page** is enabled and the user is on an album detail page, **When** they choose Play now on a track, **Then** playback starts and the user remains on the album detail page.
2. **Given** **Go to Now Playing** is enabled and the user is on an album detail page, **When** they choose Play now on a track, **Then** playback starts and the user is taken to the Now Playing page.
3. **Given** **Stay on current page** is enabled and the user plays an album from the library, **When** playback starts, **Then** the user remains on the library page they were viewing.
4. **Given** **Go to Now Playing** is enabled and the user plays an artist from spotlight, **When** playback starts, **Then** the user is taken to the Now Playing page.
5. **Given** either preference is enabled, **When** the user uses **Add to queue** only, **Then** navigation does not occur (queue append is not a play-now action).

---

### User Story 3 - Browsing continues while music plays (Priority: P2)

A user who prefers **Stay on current page** can start an album or artist, keep browsing search or library views, and use the existing Now Playing header link (including its playing-state visualizer) when they want the full Now Playing screen.

**Why this priority**: Validates that staying on-page does not trap users or block access to Now Playing; it complements P1 but is not required to ship the setting itself.

**Independent Test**: Enable **Stay on current page**, start playback from library, manually open Now Playing via header, confirm playback state and queue are unchanged.

**Acceptance Scenarios**:

1. **Given** **Stay on current page** is enabled and playback is active, **When** the user activates the header Now Playing link, **Then** they navigate to the Now Playing page without interrupting playback.
2. **Given** **Stay on current page** is enabled and the user is already on the Now Playing page, **When** they play a different album from within that flow (if applicable) or return to library and play again, **Then** behavior follows the preference without errors.

---

### Edge Cases

- **Preference changed while browsing**: The new value applies to the next play-now action; in-flight navigation is not retroactively cancelled.
- **Already on Now Playing**: Choosing **Go to Now Playing** when already on `/now-playing` is a no-op navigation; playback still updates the queue as today.
- **Invalid stored value**: Corrupt or unknown localStorage values fall back to **Go to Now Playing**.
- **Direct queue manipulation**: Changing the current track from the Now Playing queue panel is out of scope; this setting applies only to play-now actions that replace the queue via the centralized play-now hook.
- **Session restore on reload**: When the app restores a saved playback session on launch, no automatic navigation occurs regardless of preference; the user remains on their initial landing route while playback resumes in the background.
- **Offline / PWA**: Preference is stored locally and works offline like other playback settings.
- **Stay mode feedback**: When **Stay on current page** is active, no toast or other extra confirmation is shown; the user relies on audible playback and the header Now Playing indicator switching to the playing-state visualizer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a user setting in Settings → Playback to choose play navigation behavior with exactly two options: **Go to Now Playing** and **Stay on current page**.
- **FR-002**: The default value MUST be **Go to Now Playing** so existing users keep current behavior until they opt in to staying on-page.
- **FR-003**: The chosen value MUST persist in client local storage and survive app reload.
- **FR-004**: When **Go to Now Playing** is selected, all play-now actions routed through the centralized play-now hook MUST navigate to the Now Playing page after starting playback, matching current behavior.
- **FR-005**: When **Stay on current page** is selected, those same play-now actions MUST NOT change the current route; playback MUST still start.
- **FR-006**: **Add to queue** actions MUST NOT trigger navigation regardless of this setting.
- **FR-007**: The setting MUST NOT affect manual navigation to Now Playing via the header or other explicit navigation controls.
- **FR-008**: The control MUST be accessible (keyboard operable, associated label/description, options announced to assistive technology).
- **FR-009**: When **Stay on current page** is selected, the system MUST NOT show a toast or other supplemental "now playing" notification; playback feedback is limited to audio output and the existing header Now Playing playing-state indicator.
- **FR-010**: Session restore on app reload MUST NOT trigger navigation based on this preference; only explicit user play-now gestures are affected.

### Key Entities *(include if feature involves data)*

- **PlayNavigationPreference**: Client-side enum `navigate` | `stay` persisted under a dedicated localStorage key; read by the centralized play-now hook at action time.
- **Play-now action**: User gesture that replaces the queue and starts playback through the centralized play-now hook (currently track Play now, play album, play artist; any future caller of the same hook is in scope).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With **Stay on current page** enabled, 100% of play-now actions via the centralized hook leave the user on the same route while playback begins.
- **SC-002**: With **Go to Now Playing** enabled, 100% of those play-now actions navigate to `/now-playing` while playback begins.
- **SC-003**: The preference persists correctly across reload in 100% of test cases.
- **SC-004**: Users can locate and change the setting within 30 seconds of opening Settings → Playback.
- **SC-005**: Add-to-queue never causes navigation in 100% of test cases regardless of preference.

## Assumptions

- "Select something to play" means any play-now action that replaces the queue via the centralized play-now hook—not add-to-queue, in-queue skip/previous/next, or session restore on app launch.
- Default **Go to Now Playing** preserves backward compatibility with the current `usePlayNow` implementation.
- Implementation is frontend-only (localStorage preference + hook change); no server sync is required for v1.
- shadcn/ui **Radio Group** (or equivalent accessible pattern) is acceptable for the two-option control per constitution.
