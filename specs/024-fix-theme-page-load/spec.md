# Feature Specification: Fix Theme Application on Page Load

**Feature Branch**: `024-fix-theme-page-load`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Themes are not applying correctly on page load. It looks like part of the theme is being applied, but links and button colors aren't. There may be other pieces of the theme not being applied correctly either."

## Clarifications

### Session 2026-06-02

- Q: When saved theme data is corrupt or missing at load, what fallback should apply? → A: Revert entire appearance to Sync (same as 021 "storage cleared" behavior).
- Q: When an advanced theme has invalid or unsanitizable supplementary rules at load, what should happen? → A: Apply six semantic colors only; silently discard invalid supplementary rules.
- Q: For Sync mode on load, must the OS-resolved light/dark palette be correct on first paint? → A: Yes — resolved Sync palette correct on first paint; no interim wrong mode.
- Q: Should SC-001 acceptance testing include PWA standalone cold launches? → A: Yes — SC-001 includes PWA standalone cold launches alongside browser hard refresh.
- Q: When Custom mode is saved but the active theme ID references a deleted or missing advanced theme, what fallback applies at load? → A: Revert entire appearance to Sync (same as fully corrupt data).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete theme on first paint (Priority: P1)

A listener has a saved appearance preference (Sync, Light, Dark, or a Custom curated/advanced theme). They open the application or refresh the page. On the first screen they see, every major visual category—including backgrounds, text, links, and buttons—already matches their saved theme. They do not need to visit Settings or change theme mode to “fix” missing colors.

**Why this priority**: Incomplete styling on load is immediately visible and undermines trust in the theming system; interactive elements (links and buttons) are core to navigation and playback.

**Independent Test**: Set a distinctive Custom theme (or Dark/Light), hard-refresh the app, and verify library, settings, and now playing surfaces show correct link and button colors on the first paint without any user action.

**Acceptance Scenarios**:

1. **Given** the user’s saved theme mode is Custom with an active curated theme, **When** they load or refresh any primary route (library, now playing, settings), **Then** link and primary button colors match that curated theme on first paint, not default or mixed styling.
2. **Given** the user’s saved theme mode is Custom with an active advanced theme, **When** they load or refresh the application, **Then** all six semantic color roles and any saved supplementary styling apply on first paint, including link and button appearance.
3. **Given** the user’s saved theme mode is Light, Dark, or Sync, **When** they load or refresh the application, **Then** built-in mode styling is fully applied on first paint with no subset of surfaces stuck on another mode’s colors.
4. **Given** the user observes the initial load, **When** the first interactive frame is visible, **Then** they do not see a prolonged state where backgrounds look correct but links or buttons still use incorrect colors.

---

### User Story 2 - Consistency across surfaces and navigation (Priority: P2)

After load, the user moves between library browse, album detail, queue, now playing, and settings. Theme appearance—including links, buttons, borders, and emphasis colors—remains consistent with the saved preference on every surface.

**Why this priority**: Partial application may be route-specific; users expect one coherent look for the whole session.

**Independent Test**: After cold load, navigate through at least four primary surfaces without opening Appearance settings; confirm no surface reverts link or button colors to an incorrect palette.

**Acceptance Scenarios**:

1. **Given** a successful cold load with a saved Custom theme, **When** the user navigates from library to settings to now playing, **Then** link and button styling stays aligned with the active theme on each screen.
2. **Given** supplementary styling rules exist on an advanced theme, **When** the user opens settings after load, **Then** elements governed by those rules (e.g., custom link or control styling) appear correctly without requiring a theme re-selection.

---

### User Story 3 - Theme changes still apply immediately (Priority: P3)

A listener changes theme mode or selects a different Custom theme in Appearance settings. The full theme still updates immediately across the app, as it does today when switching themes during a session.

**Why this priority**: Fixing load behavior must not regress the established live-preview and instant-apply experience from custom themes.

**Independent Test**: Change from one curated Custom theme to another in settings; confirm instant full apply. Reload; confirm the new choice loads completely on first paint.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** the user selects a different curated or advanced theme in Appearance, **Then** the UI updates fully within one interaction, including links and buttons.
2. **Given** the user just changed their saved theme, **When** they refresh or restart, **Then** the newly saved theme loads completely on first paint.

---

### Edge Cases

- **Hard refresh / new tab**: Full theme applies on first paint, not only after client code finishes initializing.
- **Slow or delayed storage read**: User still sees a complete theme once the UI is interactive; brief neutral splash is acceptable only if no incorrect mixed styling appears afterward.
- **Sync mode with OS appearance change**: On load, Sync MUST resolve device light/dark before first paint—link, button, and structural colors match the resolved mode immediately with no interim wrong-mode flash; after load, Sync continues to follow OS appearance changes without requiring a manual toggle.
- **Corrupt or missing saved theme data**: Application reverts entire appearance to Sync to device (consistent with 021 storage-cleared behavior), applying the complete Sync palette—including links and buttons—not a half-applied palette or partial Custom repair.
- **Custom selection references deleted advanced theme**: Application reverts entire appearance to Sync to device with complete styling—the same fallback as corrupt or missing theme data—not a partial Custom repair to another theme.
- **Advanced theme with empty supplementary rules**: Six semantic colors alone fully style links and buttons on load; no dependency on visiting the editor.
- **Advanced theme with invalid supplementary rules**: Six semantic colors apply on load with complete link and button styling; invalid supplementary rules are silently discarded (no user notice, no Sync fallback).
- **Return visit after upgrade**: If migration remapped a legacy preset to a curated theme, that curated look—including interactive colors—loads completely on first paint.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On initial application load and full page refresh, the system MUST apply the user’s saved appearance preference as a single coherent theme before or as the user sees primary content, not as a delayed second pass that leaves interactive elements on default colors.
- **FR-002**: On initial load, link styling (default, hover, and visited where the product defines them) MUST use the active theme’s semantic colors or valid supplementary rules, not leftover colors from a prior theme or built-in default.
- **FR-003**: On initial load, button and primary control styling (filled, outline, and ghost variants where used in the product) MUST use the active theme’s accent and contrast pairing, consistent with the same theme after an in-session theme switch.
- **FR-004**: On initial load, Custom mode MUST apply the active curated or advanced selection in full: all six semantic color roles (Background, Surface, Primary Text, Secondary Text, Accent, Now-Playing Highlight) plus any saved supplementary styling rules for advanced themes.
- **FR-005**: On initial load, Light, Dark, and Sync modes MUST apply their complete built-in palettes, including interactive elements, with no mixed state where structural colors match one mode and interactive colors match another. For Sync, the OS-resolved light or dark palette MUST be active on first paint—not a default mode that corrects after bootstrap.
- **FR-006**: The system MUST NOT require the user to open Appearance settings, re-select the active theme, or toggle theme mode to correct link, button, or other missing styling after load.
- **FR-007**: In-session theme changes (mode switch, curated pick, advanced selection, save in editor) MUST continue to apply the full theme immediately; load-time behavior MUST match the visual result of an in-session apply for the same saved preference.
- **FR-008**: Primary surfaces defined in custom themes (library browse, now playing, queue, settings, header playback controls) MUST exhibit the same completeness of theme application on load as after an in-session theme change.
- **FR-009**: When persisted theme preference data is corrupt, unreadable, or references a missing advanced theme at load, the system MUST revert appearance to Sync to device with complete styling (matching 021 storage-cleared behavior), not attempt partial Custom selection repair.
- **FR-010**: When an advanced theme’s supplementary rules are invalid or fail sanitization at load, the system MUST apply all six semantic color roles with complete link and button styling and silently discard the invalid rules—not revert to Sync or block load.

### Key Entities

- **Saved appearance preference**: The persisted combination of theme mode (Sync, Light, Dark, Custom) and, when Custom, the active curated or advanced theme identity.
- **Semantic color roles**: The six product-standard roles that map to backgrounds, surfaces, text, accents, and now-playing emphasis.
- **Supplementary styling rules**: Optional appearance-only rules attached to advanced themes that refine elements beyond the six roles (e.g., links or controls).
- **Complete theme application**: All semantic roles and supplementary rules (if any) are active together; interactive elements are not excluded or deferred.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing across 20 cold-load scenarios (mix of Sync, Light, Dark, each curated theme, and at least two advanced themes with supplementary rules), 100% show correct link and button colors on the first interactive frame without user intervention. The matrix MUST include both browser hard refresh and PWA standalone cold launch for representative theme modes.
- **SC-002**: In a moderated task, at least 90% of participants report no visible “wrong colors on buttons or links” when opening the app after setting a distinctive Custom theme.
- **SC-003**: Side-by-side comparison of first paint versus post-settings theme selection shows no distinguishable difference in link or button styling for the same saved preference in 100% of QA cases.
- **SC-004**: Navigation across library, settings, and now playing after cold load shows zero instances of mixed styling (correct background with incorrect interactive colors) in structured QA passes.
- **SC-005**: Regression check: in-session theme switch still completes full visual update within one user action in 100% of acceptance test cases (no regression from fixing load behavior).

## Assumptions

- The theming capability from custom themes (built-in curated themes, advanced editor, supplementary rules, persistence) remains in scope; this feature corrects incomplete application on load rather than adding new themes or modes.
- “Links and buttons” refers to standard product controls (navigation links, shadcn-style buttons, primary actions in settings and playback)—not third-party embeds or OS-native dialogs.
- A brief blank or neutral splash during load is acceptable if the first painted UI already has the complete theme; a visible flash where interactive colors are wrong followed by correction is a failure.
- Storage and migration behavior for theme preferences follow existing product rules; this feature does not change the six-theme cap, export rules, or legacy migration policy.
- Fix applies to standard browser load and refresh **and PWA standalone cold launch**; both are required acceptance paths for this feature.

## Dependencies

- Existing Appearance settings, theme modes, semantic color model, and custom theme feature set (021-custom-themes).
- Persisted theme preference must remain readable at startup (local storage or equivalent product mechanism).
