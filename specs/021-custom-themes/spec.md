# Feature Specification: Custom Themes

**Feature Branch**: `021-custom-themes`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "https://linear.app/audiodex/project/custom-themes-197eaf5febbf/overview — Expand Custom theme mode with three curated built-in looks (Warm Tones, Retrowave, Elegant) plus an advanced path to author, import, and export fully custom themes."

## Clarifications

### Session 2026-06-01

- Q: How many user-created advanced themes may a listener save at once? → A: Fixed cap of 6.
- Q: Can listeners duplicate a built-in curated theme into an editable advanced theme? → A: Yes — duplicate any curated theme into a new advanced theme pre-filled with that palette (counts toward the cap of 6).
- Q: What may users edit in the advanced theme path beyond the six semantic color slots? → A: Six slots plus one supplementary rules area (appearance-only freeform text, 16 KB max).
- Q: When a user upgrades from an older build that already has saved custom presets, what should happen to those presets? → A: Map to curated — match legacy presets to the nearest built-in curated theme; discard non-migrated legacy data.
- Q: Which themes can users export? → A: Advanced only — only saved advanced user themes (including duplicates of curated) can be exported.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a curated custom look (Priority: P1)

A listener opens Appearance settings, selects Custom theme mode, and picks one of three built-in curated themes—Warm Tones, Retrowave, or Elegant—without configuring individual colors. The entire application immediately adopts that look, and the choice is remembered the next time they open the app.

**Why this priority**: Most users want a polished look quickly; curated themes deliver visible value without requiring design skill or time in an editor.

**Independent Test**: Can be fully tested by switching only among the three built-in custom themes and confirming consistent styling across library browse, settings, queue, and now playing surfaces after restart.

**Acceptance Scenarios**:

1. **Given** Custom theme mode is active, **When** the user opens theme selection, **Then** they see exactly three built-in curated options named Warm Tones, Retrowave, and Elegant, each with a short description of its character (warm light, retro dark, refined light).
2. **Given** Warm Tones is selected, **When** the user navigates the main application surfaces, **Then** backgrounds and surfaces read as a light, warm palette (wood-adjacent beiges, creams, and soft neutrals—not a generic gray light theme).
3. **Given** Retrowave is selected, **When** the user navigates the main application surfaces, **Then** backgrounds read as dark with vivid accent colors (e.g., bright pinks and blues) applied to interactive highlights and emphasis areas.
4. **Given** Elegant is selected, **When** the user navigates the main application surfaces, **Then** backgrounds read as a restrained, refined light palette consistent with the product reference aesthetic (soft neutrals, calm contrast, minimal visual noise).
5. **Given** the user selects any built-in curated theme, **When** they fully close and reopen the application, **Then** the same curated theme is active without re-selection.

---

### User Story 2 - Author an advanced custom theme (Priority: P2)

A listener who wants a personal look opens the advanced custom theme path (the fourth option beyond the three curated themes). They adjust each main visual element using a visual color control or by typing a value directly, optionally add supplementary styling rules for finer control, preview changes live across the app, then save under a name they choose.

**Why this priority**: Power users and tinkerers need full control; this path differentiates Custom mode from fixed Light/Dark while building on the existing semantic color slots from the base product specification.

**Independent Test**: Can be tested by creating a new advanced theme, changing at least three semantic slots with both visual and typed entry, saving, reloading the app, and confirming the saved look persists.

**Acceptance Scenarios**:

1. **Given** Custom theme mode is active, **When** the user chooses the advanced / create-your-own option, **Then** they can edit all six semantic color slots defined for the product (Background, Surface, Primary Text, Secondary Text, Accent, Now-Playing Highlight).
2. **Given** the advanced editor is open, **When** the user changes a slot via the visual color control, **Then** the entire application UI updates in real time to reflect the change.
3. **Given** the advanced editor is open, **When** the user types a value directly into a slot field, **Then** the same live preview applies and invalid values are rejected or ignored with a clear message (without breaking the rest of the UI).
4. **Given** the user has unsaved changes, **When** they choose Reset, **Then** the editor reverts to the last saved state of that theme and the UI matches that saved state.
5. **Given** the user has unsaved changes they want to keep, **When** they choose Save, **Then** the current state becomes the saved theme and persists across restarts.
6. **Given** the advanced editor, **When** the user edits the supplementary rules area beyond the six slots, **Then** those rules apply to the live preview and are stored with the saved theme (subject to product safety limits in Assumptions).
7. **Given** the advanced editor, **When** the user views styling controls, **Then** they see exactly one supplementary rules text area (in addition to the six color slots), not a structured token picker or multi-file editor.

---

### User Story 3 - Share themes via import and export (Priority: P3)

A listener exports a theme they built to share with another device or back it up, and imports a theme file received from elsewhere. Imported themes appear in their theme list with the name from the file (editable after import).

**Why this priority**: Import/export supports backup and community sharing but is not required for day-one personal use of curated or hand-built themes.

**Independent Test**: Can be tested by exporting one saved advanced theme, removing it locally, importing the exported file, and confirming visual parity and name restoration.

**Acceptance Scenarios**:

1. **Given** a saved advanced user theme exists, **When** the user exports it, **Then** the application produces a single portable theme package file that includes the theme name, all six semantic colors, and any supplementary styling rules the user saved.
2. **Given** a built-in curated theme is active (and not duplicated to advanced), **When** the user attempts export, **Then** export is unavailable or directs the user to duplicate the curated theme to advanced before exporting.
3. **Given** a valid theme package file, **When** the user imports it, **Then** the theme appears in the user's advanced theme list and can be activated immediately.
4. **Given** an import whose name collides with an existing theme, **When** import completes, **Then** the user is prompted to rename or replace (user chooses; no silent overwrite without confirmation).
5. **Given** a corrupt or unrecognized import file, **When** import is attempted, **Then** the application shows a clear error and leaves the active theme unchanged.

---

### User Story 4 - Manage multiple saved custom themes (Priority: P4)

A listener maintains several saved advanced themes: switch between them, duplicate one as a starting point, rename, and delete—while always retaining access to the three built-in curated themes.

**Why this priority**: Management actions support experimentation but depend on curated themes and the advanced editor existing first.

**Independent Test**: Can be tested by creating two advanced themes, switching between them, duplicating one, deleting a non-last user theme, and confirming built-in curated themes remain available throughout.

**Acceptance Scenarios**:

1. **Given** the user has multiple saved advanced themes, **When** they select a different saved theme, **Then** the application applies it immediately.
2. **Given** a saved advanced theme, **When** the user duplicates it, **Then** a new theme appears with a distinct name (e.g., "Copy of …") containing the same settings.
3. **Given** more than one saved advanced theme, **When** the user deletes one, **Then** it is removed from the list and another theme becomes active if the deleted theme was active.
4. **Given** only one saved advanced theme remains, **When** the user attempts to delete it, **Then** deletion is blocked or a fresh default advanced theme is created so Custom mode always has at least one editable user theme alongside the three curated themes.
5. **Given** any state of user themes, **When** the user views theme options, **Then** the three built-in curated themes (Warm Tones, Retrowave, Elegant) are always present and cannot be deleted.
6. **Given** the user already has six saved advanced themes, **When** they attempt to create, duplicate, or import another advanced theme, **Then** the application blocks the action and explains they must delete an existing advanced theme first (or replace one during import per collision flow).
7. **Given** fewer than six saved advanced themes, **When** the user duplicates a built-in curated theme (Warm Tones, Retrowave, or Elegant), **Then** a new advanced theme appears with that curated palette pre-filled, a distinct default name (e.g., "Warm Tones (custom)"), and counts toward the six-theme cap.

---

### Edge Cases

- **Switching from Custom to Light/Dark/Sync while editing**: Unsaved advanced edits prompt to save, discard, or cancel navigation; curated selection does not require a save prompt if already saved as the active curated choice.
- **Low-contrast or unreadable colors**: The application applies user choices without contrast warnings or blocks (consistent with base product theming policy); recovery is via Reset, picking a curated theme, or switching theme mode.
- **Import during active playback**: Import does not interrupt playback; theme applies on completion without stopping audio.
- **At the six-theme cap**: Create, duplicate, and import (as a net-new theme) are blocked until the user deletes an advanced theme; import-with-replace remains available when the user explicitly confirms replacing an existing theme.
- **Very large supplementary styling text**: Import or paste beyond allowed size is rejected with a clear limit message; active theme unchanged.
- **Storage cleared / "Clear everything"**: Theme mode reverts to Sync to device; built-in curated definitions remain available; user-created and imported themes are removed.
- **First launch**: Users without prior custom data see Warm Tones, Retrowave, and Elegant as the primary Custom options; a default advanced user theme is created if none exists so Custom mode is never empty.
- **Upgrade from older builds with legacy custom presets**: Legacy presets are not migrated as advanced themes. The application selects the built-in curated theme that best matches the user’s last-active legacy preset (nearest perceptual match among Warm Tones, Retrowave, and Elegant), activates it in Custom mode, and discards legacy preset storage. Other legacy presets are not retained. A one-time notice explains that custom colors were mapped to the closest curated look and that users can duplicate a curated theme to customize again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When theme mode is Custom, the application MUST offer three non-deletable built-in curated themes: **Warm Tones** (light, warm wood-adjacent palette), **Retrowave** (dark with vivid pink/blue accents), and **Elegant** (restrained refined light palette per product reference).
- **FR-002**: Selecting a built-in curated theme MUST apply it application-wide immediately and MUST persist as the active Custom selection across restarts.
- **FR-003**: The application MUST offer a fourth Custom option—advanced / create-your-own—that exposes the six semantic color slots (Background, Surface, Primary Text, Secondary Text, Accent, Now-Playing Highlight) for user editing.
- **FR-004**: Each semantic color slot MUST be editable through both a visual color chooser and direct typed entry of the value.
- **FR-005**: While editing an advanced custom theme, color changes MUST apply to the full application UI in real time (live preview).
- **FR-006**: The advanced editor MUST provide **Reset** (revert to last saved state of the current theme) and **Save** (commit current state) actions.
- **FR-007**: The advanced path MUST provide exactly **one** supplementary rules text area beyond the six color slots. Rules MUST be optional, appearance-only, subject to the 16 KB limit and safety constraints in Assumptions; saved rules MUST apply with the theme in live preview and be included in export.
- **FR-008**: Users MUST be able to export and import **advanced user themes only** (saved advanced themes, including those created by duplicating a curated theme). Built-in curated themes MUST NOT be directly exportable; users who want to share a curated look MUST duplicate it to advanced first, then export.
- **FR-009**: Imported themes MUST retain their packaged name; users MUST be able to rename after import; name collisions MUST require explicit user confirmation before overwrite.
- **FR-010**: Users MUST be able to maintain multiple saved advanced themes with switch, duplicate, rename, and delete actions; at least one saved advanced theme MUST always remain available in Custom mode.
- **FR-010a**: The application MUST allow at most **six** saved advanced user themes at one time. Create, duplicate, and net-new import MUST be blocked at the cap until the user deletes an existing advanced theme (import that replaces an existing theme per FR-009 remains allowed).
- **FR-011**: Built-in curated themes MUST remain available regardless of how many user themes exist and MUST NOT be deletable.
- **FR-011a**: Users MUST be able to duplicate any built-in curated theme into a new advanced user theme pre-filled with that curated palette; the duplicate counts toward the six-theme cap and is editable in the advanced editor.
- **FR-012**: Custom theme selection (curated or advanced) and active advanced theme identity MUST persist across application restarts.
- **FR-013**: The application MUST NOT enforce accessibility contrast checks on user-chosen colors or supplementary rules; no warnings or blocks for low-contrast combinations.
- **FR-014**: Appearance settings MUST remain the single place to change theme mode (Sync, Light, Dark, Custom) and Custom sub-selection, consistent with the base product Appearance section.
- **FR-015**: Curated and advanced custom themes MUST apply consistently across all primary surfaces: library browse, now playing, queue, settings, and header playback controls.
- **FR-016**: On upgrade from a build that stored legacy custom presets, the application MUST map the last-active legacy preset to the nearest built-in curated theme (Warm Tones, Retrowave, or Elegant), activate that curated theme, discard legacy preset data, and show a one-time notice describing the mapping. Legacy presets MUST NOT be imported as advanced themes during upgrade.

### Key Entities

- **Theme mode**: One of Sync to device, Light, Dark, or Custom—controls whether curated/advanced custom options are used.
- **Built-in curated theme**: A fixed, product-shipped palette (Warm Tones, Retrowave, Elegant) with display name, short description, and complete mapping to semantic color slots. Curated themes may be duplicated into advanced user themes but are not themselves editable or deletable.
- **Advanced user theme**: A user-named theme comprising six semantic colors, optional supplementary styling rules, and metadata (name, created/updated timestamps for display only). The installation holds at most six of these at once (curated themes do not count toward this limit).
- **Theme package**: A portable export artifact for advanced user themes only, containing theme name, semantic colors, and optional supplementary rules suitable for import on another installation.
- **Active custom selection**: Which curated theme or advanced user theme is currently driving appearance when mode is Custom.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated testing, at least 90% of participants can apply Warm Tones, Retrowave, or Elegant from Appearance settings within 30 seconds without assistance.
- **SC-002**: In moderated testing, at least 85% of participants can create, save, and restore a distinct advanced custom theme (change at least three slots, save, restart app, confirm persistence) within 5 minutes.
- **SC-003**: Export followed by import on a clean profile reproduces the same visual appearance for all six semantic slots in 100% of acceptance test cases.
- **SC-004**: Switching between any two saved themes (curated or advanced) updates the visible UI within one interaction with no conflicting mixed styling observed on library, now playing, or settings screens during QA.
- **SC-005**: At least 95% of invalid import attempts in acceptance testing show a user-visible error and leave the previously active theme unchanged.
- **SC-006**: Users report satisfaction with curated theme distinctiveness: in a 5-point survey, average score of 4 or higher for "Warm Tones, Retrowave, and Elegant feel noticeably different from each other and from Light/Dark."

## Assumptions

- Base theme modes (Sync, Light, Dark, Custom) and the six semantic slots from the core product specification remain authoritative; this feature extends Custom mode rather than replacing global theme behavior.
- **Elegant** palette is defined by the product team using the reference image attached in the Linear project; acceptance uses side-by-side visual review against that reference, not automated image matching.
- Advanced styling beyond the six semantic color slots is edited only through a single supplementary rules text area (freeform appearance-related declarations such as colors, borders, and typography sizing)—not a structured token picker or multi-pane stylesheet editor in this release.
- Supplementary styling rules MUST NOT execute scripts or load external resources; maximum size is 16 KB per theme to protect performance and storage.
- User-created advanced themes are stored locally on the device; no cloud sync of themes in this feature scope.
- A maximum of six saved advanced user themes per installation is enforced; built-in curated themes (Warm Tones, Retrowave, Elegant) are excluded from this count.
- Built-in curated themes ship with the application; they do not require network download.
- Color typed-entry accepts the same value formats already used by the application's theming system today; invalid formats show inline feedback without crashing the UI.
- Import/export package format is a single human-readable document (e.g., structured text) versioned by the product so future releases can migrate older packages.
- Upgrade migration from legacy custom presets uses nearest-match mapping to one curated theme only; detailed matching rules are defined during planning/implementation but MUST be deterministic and testable.

## Dependencies

- Existing Appearance settings section and Custom theme mode from the core music player specification (theme modes, semantic slots, live preview, no contrast enforcement, persistence).
- Visual reference for **Elegant** curated theme provided in the Linear project description (attached image).
