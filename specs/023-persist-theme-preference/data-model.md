# Phase 1 Data Model: Persist Theme Preference

**Feature**: 023-persist-theme-preference  
**Date**: 2026-06-01  
**Extends**: [021-custom-themes/data-model.md](../021-custom-themes/data-model.md)

No new PostgreSQL tables or REST endpoints. This feature tightens **client persistence invariants** and **hydration lifecycle** for existing entities.

## Persisted entities (unchanged keys)

| Entity | Storage key | Type | Default when absent |
|--------|-------------|------|---------------------|
| Appearance mode | `dexaudio.theme.mode` | `"sync" \| "light" \| "dark" \| "custom"` | `"sync"` |
| Custom selection | `dexaudio.theme.customSelection` | `CustomSelection` | ignored unless mode is `custom` |
| Advanced themes | `dexaudio.customPresets` | `AdvancedTheme[]` | `[]` (may auto-seed one default when editor needs it; does not change appearance mode) |
| Migration flag | `dexaudio.theme.migrationV1` | `boolean` | `false` |

Types `ThemeMode`, `CustomSelection`, `AdvancedTheme`, `CuratedThemeId` are unchanged from 021.

## Hydration result (runtime, ephemeral)

Produced by `hydrateThemeFromStorage()` on each cold load:

| Field | Type | Notes |
|-------|------|-------|
| `themeMode` | `ThemeMode` | Effective mode after validation |
| `customSelection` | `CustomSelection \| null` | Set only when `themeMode === "custom"` |
| `repaired` | `boolean` | True if storage was corrected (e.g., invalid advanced id → sync) |

## Validation rules (new / updated)

| ID | Rule |
|----|------|
| **P1** | On load, if `themeMode` is not a valid enum, coerce to `sync` and persist. |
| **P2** | On load, if `themeMode === "custom"` and `customSelection.kind === "advanced"` and id ∉ `customPresets`, set `themeMode` to `sync`, persist, do **not** auto-activate another advanced theme. |
| **P3** | On load, if `themeMode === "custom"` and `customSelection.kind === "curated"` and id ∉ known curated set, set `themeMode` to `sync`, persist. |
| **P4** | On user delete of the **active** advanced theme, set `themeMode` to `sync` and persist (other advanced themes remain in list). |
| **P5** | Hydration MUST run synchronously before first React render (`main.tsx`). |
| **P6** | `theme-store.bootstrap()` MUST use the same reconciliation as hydration so UI state matches DOM. |
| **P7** | Every explicit user theme change in Appearance settings MUST write `themeMode` (and `customSelection` when custom) before returning. |

## State transitions

```text
[any mode] --user selects--> persist keys --refresh--> hydrate --> same mode

custom + advanced:active --advanced deleted--> sync (persist)

custom + advanced:missing-id --hydrate--> sync (persist, repair)

missing/invalid storage --hydrate--> sync (default)
```

## Relationships

- **Appearance preference** = `themeMode` + optional `customSelection` when mode is `custom`.
- **Advanced theme library** is independent of active mode after FR-009 recovery (themes remain stored but inactive).
