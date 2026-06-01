# Phase 1 Data Model: Custom Themes

**Feature**: 021-custom-themes  
**Date**: 2026-06-01

No PostgreSQL tables or REST API resources. All state is **client-only** (`localStorage` + ephemeral DOM injection for supplementary rules).

## Persisted entities

### Theme mode (existing)

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| `themeMode` | `"sync" \| "light" \| "dark" \| "custom"` | `StorageKeys.themeMode` | Default `"sync"` |

### Custom selection (new)

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| `customSelection` | `CustomSelection` | `StorageKeys.customSelection` | Active driver when `themeMode === "custom"` |

```ts
type CustomSelection =
  | { kind: "curated"; id: CuratedThemeId }
  | { kind: "advanced"; id: string }; // uuid

type CuratedThemeId = "warm-tones" | "retrowave" | "elegant";
```

**Validation**: If `themeMode !== "custom"`, selection may remain stored but is ignored until Custom is re-selected.

### Advanced user theme (evolved from `CustomThemePreset`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` (uuid) | yes | Stable identity |
| `name` | `string` | yes | 1–64 chars; unique among advanced themes (case-insensitive compare on import) |
| `colors.background` | HSL string | yes | `"H S% L%"` |
| `colors.surface` | HSL string | yes | maps to `--card` |
| `colors.primaryText` | HSL string | yes | maps to `--foreground` |
| `colors.secondaryText` | HSL string | yes | maps to `--muted-foreground` |
| `colors.accent` | HSL string | yes | maps to `--accent` |
| `colors.nowPlayingHighlight` | HSL string | yes | maps to `--now-playing-highlight` |
| `supplementaryRules` | `string` | no | Max 16 KB UTF-8; sanitized before inject |
| `createdAt` | ISO-8601 | yes | Display/metadata |
| `updatedAt` | ISO-8601 | yes | Updated on Save |

**Storage**: `StorageKeys.customPresets` → `AdvancedTheme[]` (max length **6**).

**Validation rules**:
- **V1**: `customPresets.length <= 6` enforced on create, duplicate, import (net-new).
- **V2**: At least one advanced theme MUST exist whenever `themeMode === "custom"` (auto-seed `default` if empty after migration).
- **V3**: Cannot delete last advanced theme unless replacement is created in same transaction.
- **V4**: `name` trimmed; empty names rejected on Save.

### Built-in curated theme (read-only, code-shipped)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `CuratedThemeId` | Fixed set of 3 |
| `name` | string | Warm Tones / Retrowave / Elegant |
| `description` | string | Short character blurb for UI |
| `colors` | same six slots as advanced | Baked into `curated-themes.ts` |

Not stored in `localStorage`. Not exportable (FR-008).

### Theme migration flag (new)

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| `themeMigrationV1` | `boolean` | `StorageKeys.themeMigrationV1` | Set after legacy preset → curated migration |

### One-time upgrade notice (transient / session)

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| `legacyThemeMappedNotice` | boolean | `sessionStorage` optional | Avoid repeat toast same session |

## Ephemeral runtime state

### Supplementary style element

| Element | Purpose |
|---------|---------|
| `#dexaudio-theme-supplement` | Holds sanitized CSS text for active advanced theme only |

Removed/cleared when curated theme active or mode leaves `custom`.

### Theme editor draft (Zustand)

| Field | Type | Notes |
|-------|------|-------|
| `draft` | `AdvancedTheme` clone | Live preview while editing |
| `dirty` | `boolean` | Unsaved changes |
| `validationErrors` | `Record<string, string>` | Per-slot / rules errors |

## Theme package (import/export file)

Not persisted as a separate entity; deserialized into `AdvancedTheme` on import.

See [contracts/theme-package-v1.md](./contracts/theme-package-v1.md).

## State transitions

```text
themeMode sync/light/dark
  → sets data-theme sync/light/dark; clears supplement node

themeMode custom + curated selection
  → data-theme=custom; apply curated colors; no supplement unless duplicated advanced active

themeMode custom + advanced selection
  → data-theme=custom; apply advanced colors; inject supplement if present

edit advanced (dirty)
  → live preview on draft
  → Reset → reload last saved advanced[id]
  → Save → persist to customPresets[id], clear dirty

duplicate curated
  → if count < 6: new advanced row, select advanced, open editor

at cap (6 advanced)
  → block create/duplicate/net-new import; allow import-replace with confirm
```

## Relationships

```text
AppearanceSettingsSection
  ├── CuratedThemePicker (3 built-in)
  ├── AdvancedThemeList (≤6)
  └── AdvancedThemeEditor (six slots + supplementary textarea)

theme-store (Zustand)
  ├── reads/writes localStorage keys
  └── calls theme-engine.apply*

useThemeSync
  └── on sync mode: OS preference listener (unchanged)
  └── defers custom apply to theme-store bootstrap on mount

theme-migration (boot)
  └── legacy customPresets → curated selection + flag
```
