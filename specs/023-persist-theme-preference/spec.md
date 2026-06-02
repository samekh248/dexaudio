# Feature Specification: Persist Theme Preference

**Feature Branch**: `023-persist-theme-preference`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "The theme isn't sticky. It resets on page refresh, which it shouldnt do. It should stay through page refresh, new versions of the app, new sessions."

## Clarifications

### Session 2026-06-01

- Q: What is the documented default appearance when no valid persisted preference exists? → A: System sync (follow OS light/dark preference).
- Q: When custom mode’s active advanced theme was deleted and no saved advanced themes remain, what should happen? → A: Leave custom mode — switch to system sync.
- Q: When the active advanced theme was deleted but other saved advanced themes still exist, which theme should become active? → A: Switch to system-synced appearance (do not auto-select another saved advanced theme).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Theme survives a page refresh (Priority: P1)

A listener chooses any appearance theme (system sync, light, dark, or a specific custom look including curated and saved advanced themes). They refresh the page or reload the application in the same browser. When the app loads again, the same theme and custom selection are active without visiting settings again.

**Why this priority**: Refresh is the most common trigger for lost preferences and directly matches the reported bug.

**Independent Test**: Select each supported theme mode once, hard-refresh the page, and confirm the visual appearance and settings selection match what was chosen before refresh.

**Acceptance Scenarios**:

1. **Given** the user has selected Light appearance, **When** they refresh the page, **Then** Light remains active and Appearance settings show Light as selected.
2. **Given** the user has selected Dark appearance, **When** they refresh the page, **Then** Dark remains active and Appearance settings show Dark as selected.
3. **Given** the user has selected system-synced appearance, **When** they refresh the page, **Then** system-synced mode remains active.
4. **Given** the user has selected a built-in curated custom theme (Warm Tones, Retrowave, or Elegant), **When** they refresh the page, **Then** the same curated theme is active and visibly applied across main surfaces.
5. **Given** the user has selected a saved advanced custom theme, **When** they refresh the page, **Then** that same advanced theme is active with its saved colors and styling.
6. **Given** the user had an advanced custom theme active and that theme was deleted, **When** they refresh the page, **Then** system-synced appearance is active, Appearance settings show system sync selected, and any other saved advanced themes remain listed but are not auto-applied.

---

### User Story 2 - Theme survives a new browsing session (Priority: P2)

A listener closes the browser tab or entire browser, then opens the application again later on the same device and browser profile. Their last chosen theme is still active.

**Why this priority**: Users expect appearance choices to behave like other durable preferences (volume, playback settings), not session-only state.

**Independent Test**: Set a non-default theme, fully quit the browser, reopen the app URL, and verify theme without re-selection.

**Acceptance Scenarios**:

1. **Given** the user previously chose Dark appearance and closed the browser, **When** they open the application in a new session on the same browser profile, **Then** Dark is active.
2. **Given** the user previously chose a specific custom theme and closed the browser, **When** they return in a new session, **Then** the same custom theme (curated or advanced) is active.

---

### User Story 3 - Theme survives an application update (Priority: P3)

A listener updates to a newer version of the application (deployed build). Their previously saved theme preference is preserved or sensibly migrated; it does not silently reset to a factory default unless no valid saved preference exists.

**Why this priority**: Users should not need to reconfigure appearance after every release.

**Independent Test**: Save a distinctive custom theme, simulate or perform an upgrade to a newer build, launch the app, and confirm the theme matches pre-upgrade (or documented migration outcome).

**Acceptance Scenarios**:

1. **Given** a saved theme preference from the previous version, **When** the user opens the app after upgrading, **Then** the same theme mode and custom selection are active.
2. **Given** stored preference data uses an older format that the new version still understands, **When** the app loads after upgrade, **Then** the preference is migrated once and the user sees their prior look (or the closest supported equivalent with no silent reset to unrelated defaults).
3. **Given** no valid saved preference exists (first visit or cleared storage), **When** the app loads, **Then** system-synced appearance is active (following the OS light/dark preference).

---

### Edge Cases

- What happens when the browser blocks or clears site storage (private browsing, manual clear data, corporate policy)? The app applies system-synced appearance as the default and does not crash; the user can re-select a theme in settings.
- What happens when a saved advanced theme was deleted but the active selection still references it? The app switches to system-synced appearance, persists that mode, and leaves custom mode. Any other saved advanced themes remain in the user’s library for manual re-selection. The UI must not break or appear unstyled.
- What happens when the user changes theme multiple times quickly before a reload? The last explicit choice wins after reload.
- What happens when two tabs are open and the user changes theme in one tab? After refresh, both tabs reflect the last persisted choice (eventual consistency on reload is acceptable).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST persist the user’s selected appearance mode (system sync, light, dark, or custom) whenever the user explicitly chooses a mode in Appearance settings.
- **FR-002**: When custom mode is active, the application MUST persist which custom look is selected (built-in curated theme or a specific saved advanced theme).
- **FR-003**: On every application load (including full page refresh), the application MUST restore the last persisted appearance mode and custom selection before the user interacts with settings.
- **FR-004**: Restored theme MUST be applied to the visible interface immediately on load so users do not briefly see an incorrect theme flash unless unavoidable; any brief transition must be minimal.
- **FR-005**: Persisted preferences MUST survive closing and reopening the browser on the same device and browser profile (new session).
- **FR-006**: Persisted preferences MUST survive application version upgrades when storage remains available, using migration only when stored data format changes—never discarding a valid preference without user action.
- **FR-007**: Changing appearance in settings MUST update persisted preference synchronously with the user’s selection so a refresh immediately afterward reflects the latest choice.
- **FR-008**: If persisted data is missing, corrupt, or invalid, the application MUST fall back to system-synced appearance (following the OS light/dark preference) and allow the user to choose again without error.
- **FR-009**: If the active custom selection references a removed advanced theme, the application MUST switch to system-synced appearance, persist that mode, and MUST NOT leave the UI in a broken or unstyled state. Remaining saved advanced themes stay available in settings but are not auto-activated.
- **FR-010**: Theme persistence MUST apply equally to all supported theme modes and custom variants defined by the product (including the three curated themes and user-saved advanced themes).

### Key Entities

- **Appearance preference**: The user’s chosen high-level mode—system sync, light, dark, or custom—and when custom, which specific look is active.
- **Custom theme selection**: Either a built-in curated theme identifier or a reference to one saved advanced theme from the user’s library.
- **Saved advanced themes**: Named user themes (colors and optional supplementary styling) stored locally; distinct from the transient in-editor draft.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In manual testing across all four appearance modes and at least one curated and one advanced custom theme, 100% of hard page refreshes restore the same selection and visibly matching appearance.
- **SC-002**: After closing and reopening the browser, 100% of test runs on the same profile restore the last chosen theme without user intervention.
- **SC-003**: After simulating an application version upgrade with existing saved preferences, 100% of test runs preserve or correctly migrate the user’s theme with no unexplained reset to factory default.
- **SC-004**: Users can change theme, refresh within 5 seconds, and see the correct theme on first paint in at least 95% of attempts (no requirement to re-open Appearance settings).
- **SC-005**: Support burden: zero new reports of “theme resets on refresh” for this cause after release, measured over the first two weeks in environments where storage is allowed.

## Assumptions

- Persistence is per browser profile on the user’s device (standard for a web application); cross-device sync is out of scope unless the product later adds account-backed settings.
- When no valid saved appearance preference exists, the default is system-synced mode (not a fixed light, dark, or custom curated look).
- When custom mode cannot be restored because the active advanced theme reference is invalid (deleted theme), recovery always uses system-synced mode rather than auto-selecting another saved advanced or curated theme. Other saved advanced themes may remain for manual use.
- Private or ephemeral browsing modes may not retain storage; falling back to defaults in those cases is acceptable.
- Scope includes all appearance modes shipped in the product today, building on the custom themes capability already specified elsewhere.
- “New session” means a new browser session on the same profile, not a different user account or device.
- Application updates may change internal storage format; one-time migration is acceptable if the user-visible theme is preserved.

## Dependencies

- Existing Appearance settings and custom themes behavior (light/dark/sync/custom, curated themes, advanced themes) as already defined for the product.
- Other client preferences in the app already use durable local storage; theme persistence should behave consistently with those preferences.
