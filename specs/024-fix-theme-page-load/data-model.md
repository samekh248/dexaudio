# Phase 1 Data Model: Fix Theme Application on Page Load

**Feature**: 024-fix-theme-page-load  
**Date**: 2026-06-02

Extends the client-only theme model from **021-custom-themes**. No PostgreSQL or REST changes.

## Persisted entities (unchanged keys)

See [021 data-model](../021-custom-themes/data-model.md) for `themeMode`, `customSelection`, `customPresets`, migration flag, and curated/advanced shapes.

### Load-time validation additions

| Check | Rule | On failure |
|-------|------|------------|
| **V-L1** | `themeMode` must be one of `"sync" \| "light" \| "dark" \| "custom"` | Sync revert (FR-009) |
| **V-L2** | `customPresets` must parse as `AdvancedTheme[]` | Sync revert |
| **V-L3** | When mode is Custom + `customSelection.kind === "advanced"`, referenced `id` MUST exist in `customPresets` | Sync revert (FR-009) |
| **V-L4** | When mode is Custom + `customSelection.kind === "curated"`, `id` MUST be valid `CuratedThemeId` | Sync revert |
| **V-L5** | Advanced theme `colors` MUST pass `areThemeColorsValid` | Sync revert |
| **V-L6** | Advanced `supplementaryRules` failing sanitization | Apply colors only; discard rules (FR-010) |

## Ephemeral runtime state (new)

### Theme bootstrap flag

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| `themeBootstrapped` | `boolean` | module scope in `theme-bootstrap.ts` | Prevents duplicate DOM apply when boot entry + main + store all invoke bootstrap |

### Bootstrap result (transient)

```ts
type ThemeBootstrapFallbackReason =
  | "invalid-theme-mode"
  | "corrupt-storage"
  | "missing-advanced-theme"
  | "invalid-curated-id"
  | "invalid-theme-colors";

type ThemeBootstrapResult = {
  themeMode: ThemeMode;
  customSelection: CustomSelection;
  advancedThemes: AdvancedTheme[];
  migrationNotice: string | null;
  fallbackApplied: boolean;
  fallbackReason?: ThemeBootstrapFallbackReason;
};
```

Returned by `bootstrapThemeFromStorage()`; consumed by `theme-store.bootstrap()` to hydrate Zustand without re-reading storage inconsistently.

## State transitions on load

```text
[Page load]
    │
    ▼
runThemeMigration() ──► may set customSelection + themeMode (021 FR-016)
    │
    ▼
Read themeMode + selection + presets
    │
    ├─► Valid Custom curated ──► applyCuratedTheme(id)
    ├─► Valid Custom advanced ──► applyAdvancedTheme(theme) [sanitize rules]
    ├─► Light / Dark ──► applyDataTheme(mode)
    ├─► Sync ──► applyDataTheme("sync", OS dark?)
    │
    └─► Any V-L1..V-L5 failure ──► applyDataTheme("sync", OS dark?)
                                   + persist themeMode = "sync"
                                   + fallbackApplied = true
```

## DOM effects (unchanged contract from 021)

| Mode | `data-theme` | CSS variables | Supplementary |
|------|--------------|---------------|---------------|
| sync (light) | `light` | from `themes.css` | cleared |
| sync (dark) | `dark` | from `themes.css` | cleared |
| light / dark | `light` / `dark` | from `themes.css` | cleared |
| custom | `custom` | inline six slots + derived contrast | optional `#dexaudio-theme-supplement` |

**Complete theme application** (spec entity): on load, all three columns MUST be consistent before first React commit—interactive tokens (`--primary`, `--accent`, etc.) included.

## Relationships

```text
theme-boot-entry.ts ──calls──► theme-bootstrap.ts ──calls──► theme-engine.ts
main.tsx ──calls──► theme-bootstrap.ts (idempotent)
theme-store.bootstrap ──calls──► theme-bootstrap.ts ──hydrates──► Zustand ThemeStore
useThemeSync ──subscribes──► OS scheme when themeMode === "sync"
```
