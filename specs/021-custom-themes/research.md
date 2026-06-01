# Phase 0 Research: Custom Themes

All technical unknowns from the plan's Technical Context are resolved below. No `NEEDS CLARIFICATION` remain.

## 1. How custom/curated themes apply to the UI

**Decision**: When `themeMode === "custom"`, set `document.documentElement` attribute `data-theme="custom"` and write Tailwind-compatible HSL components (space-separated `"H S% L%"`) to the existing CSS variables: `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, plus a dedicated `--now-playing-highlight` custom property consumed by now-playing components.

Centralize in `frontend/src/lib/theme-engine.ts` with `applyTheme(selection)` where `selection` is either a curated id or an advanced theme record.

**Rationale**: The app already uses CSS variables + `data-theme` (see `themes.css`, `applyCustomPreset`). Extending the same mechanism avoids a second styling system and keeps shadcn/Tailwind tokens coherent. Curated themes are static maps in `curated-themes.ts`; advanced themes reuse the six semantic slots.

**Alternatives considered**:
- Per-component inline styles — duplicates mapping, hard to maintain. Rejected.
- Replacing Tailwind with runtime-generated stylesheet only — breaks existing light/dark/sync paths. Rejected.

## 2. Persisting active custom selection

**Decision**: Add `StorageKeys.customSelection` storing JSON:

```ts
type CustomSelection =
  | { kind: "curated"; id: "warm-tones" | "retrowave" | "elegant" }
  | { kind: "advanced"; id: string };
```

Keep `StorageKeys.customPresets` as the array of advanced themes (max 6). Remove reliance on a single implicit “first preset” as the active theme.

**Rationale**: Spec requires curated vs advanced to be mutually exclusive active drivers (Key Entity: Active custom selection). Splitting selection from the preset list supports curated picks without creating dummy advanced rows.

**Alternatives considered**:
- Encode curated themes as synthetic advanced presets — conflates non-deletable curated with capped user list. Rejected.

## 3. Theme package import/export format (v1)

**Decision**: JSON file, extension `.dexaudio-theme.json`, schema version field `dexaudioTheme: 1`:

| Field | Type | Required |
|-------|------|----------|
| `dexaudioTheme` | `1` | yes |
| `name` | string (1–64 chars) | yes |
| `colors` | six semantic HSL strings | yes |
| `supplementaryRules` | string | no (max 16 KB UTF-8) |

Validate with Zod in `theme-package.ts`. Export uses `Blob` + programmatic `<a download>`. Import uses hidden `<input type="file" accept=".json,application/json">`.

**Rationale**: Human-readable, versioned, easy to test, no backend. Matches spec assumption and enables future migrations via `dexaudioTheme` version bump.

**Alternatives considered**:
- ZIP with assets — out of scope (no external resources). Rejected.
- YAML — extra parser dependency. Rejected (Constitution V).

## 4. Supplementary rules safety

**Decision**: Inject validated rules into a single `<style id="dexaudio-theme-supplement" data-theme-supplement>` child of `document.head`. Before injection:

- Reject if UTF-8 byte length > 16_384.
- Reject if content matches blocklist (case-insensitive): `@import`, `url(`, `javascript:`, `expression(`, `behavior:`, `-moz-binding`, `<script`, `@charset`.
- Allow only declarations targeting `:root`, `[data-theme="custom"]`, or custom properties (`--*`).

Parse loosely: split on `}` and ensure each block’s selector is allowlisted; drop disallowed blocks silently in preview, show error on Save if any block dropped.

**Rationale**: Meets FR-007 safety without adding a CSS parser dependency. Sufficient for appearance-only user rules.

**Alternatives considered**:
- Full PostCSS sandbox — new dependency, heavy. Rejected.
- No validation — violates Assumptions. Rejected.

## 5. Legacy preset → curated migration (FR-016)

**Decision**: One-time migration on app boot in `theme-migration.ts` when `customPresets` exists and `StorageKeys.themeMigrationV1` is unset:

1. Determine **last-active** legacy preset (use `customPresetId` if set, else first preset).
2. Compute weighted Euclidean distance in normalized HSL space between preset colors `(background, surface, accent)` and each curated theme’s centroid (same three slots, equal weights).
3. Pick curated id with minimum distance; tie-break order: `warm-tones` → `elegant` → `retrowave`.
4. Set `customSelection` to `{ kind: "curated", id }`, `themeMode` to `custom`, delete `customPresets` / `customPresetId`, set migration flag, enqueue Sonner toast explaining mapping + “duplicate curated to customize again.”

**Rationale**: Deterministic, testable, no ML. Uses slots most responsible for overall “feel” (background/surface/accent).

**Alternatives considered**:
- Migrate presets into advanced list — rejected by clarification (map to curated only).
- Perceptual LAB color distance — marginal gain, more code. Deferred; HSL distance acceptable for v1.

## 6. Color entry UX (visual + typed)

**Decision**: For each semantic slot, render shadcn `Label` + native `<input type="color">` (hex) paired with `Input` accepting HSL triple `"H S% L%"` (existing storage format). On color picker change, convert hex → HSL and update both fields. Validate with regex + range checks; invalid typed input shows inline error and does not call `applyTheme` until valid.

**Rationale**: No new color library (Constitution V). Native picker is accessible and well-supported in PWA.

**Alternatives considered**:
- shadcn-only custom picker — would be a new custom component; native + Input is sufficient. Rejected unless UX gaps found in QA.

## 7. Reactive theme updates across routes

**Decision**: Add lightweight `theme-store.ts` (Zustand, subscribe via `localStorage` sync) exposing `selection`, `advancedThemes`, `applyCurated`, `applyAdvanced`, etc. Settings UI and `useThemeSync` subscribe to the store so live preview updates all surfaces without full page reload.

**Rationale**: Current `AppearanceSettingsSection` mutates DOM directly and does not re-read on navigation; store aligns with `lossless-prefs-store` pattern already in the codebase.

**Alternatives considered**:
- React Context only — workable but project already uses Zustand for prefs. Store preferred for consistency.

## 8. WCAG vs custom theme policy

**Decision**: Ship curated palettes designed to meet WCAG 2.1 AA for default control chrome (buttons, links) on their backgrounds. Advanced/custom user themes remain **exempt** from contrast enforcement per FR-013 (product policy); settings controls themselves still require labels, focus rings, and keyboard operability (Constitution IV).

**Rationale**: Resolves apparent tension between Constitution IV and FR-013: AA applies to chrome/interaction patterns, not user-selected theme colors.
