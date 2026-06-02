# Contract: Appearance Preference Persistence (client-only)

**Feature**: 023-persist-theme-preference  
**Type**: localStorage + hydration invariants (no HTTP endpoint)

## Storage keys

| Key | Constant | Value shape |
|-----|----------|-------------|
| `dexaudio.theme.mode` | `StorageKeys.themeMode` | `ThemeMode` |
| `dexaudio.theme.customSelection` | `StorageKeys.customSelection` | `CustomSelection` |
| `dexaudio.customPresets` | `StorageKeys.customPresets` | `AdvancedTheme[]` |
| `dexaudio.theme.migrationV1` | `StorageKeys.themeMigrationV1` | `boolean` |

## ThemeMode enum

```yaml
ThemeMode:
  enum: [sync, light, dark, custom]
  default: sync
```

## CustomSelection (when themeMode = custom)

```yaml
CustomSelection:
  oneOf:
    - kind: curated
      id: [warm-tones, retrowave, elegant]
    - kind: advanced
      id: string  # uuid matching customPresets[].id
```

## Hydration API (module contract)

**Module**: `frontend/src/lib/theme-hydration.ts`

| Export | Signature | Behavior |
|--------|-----------|----------|
| `hydrateThemeFromStorage` | `() => HydrationResult` | Sync read → validate → apply DOM → persist repairs |

**Call order** (application boot):

1. `runThemeMigration()` (`theme-migration.ts`)
2. `hydrateThemeFromStorage()` (`theme-hydration.ts`)
3. `createRoot(...).render(<App />)`
4. `useThemeStore.getState().bootstrap()` (React mount; must not change effective theme)

## Invariants

| Name | Rule |
|------|------|
| `hydrate_before_render` | `hydrateThemeFromStorage` MUST run in `main.tsx` before `createRoot`. |
| `bootstrap_idempotent` | Second call via `theme-store.bootstrap()` MUST leave DOM and store aligned with first hydration. |
| `default_mode_sync` | IF no valid `themeMode` THEN effective mode = `sync`. |
| `invalid_advanced_to_sync` | IF mode = `custom` AND selection references missing advanced id THEN mode → `sync`, persist, do NOT auto-select another advanced theme. |
| `delete_active_advanced_to_sync` | IF user deletes the active advanced theme THEN mode → `sync`, persist. |
| `persist_on_user_change` | IF user explicitly changes appearance in settings THEN `themeMode` (and `customSelection` when custom) written before UI returns. |
| `custom_selection_ignored_when_not_custom` | IF `themeMode` ≠ `custom` THEN `customSelection` may remain in storage but MUST NOT drive DOM until user selects custom again. |
| `no_backend_persistence` | Appearance preference MUST NOT be sent to `/api/v1/*` for this feature. |

## DOM application

Uses existing `theme-engine.ts`:

| mode | Apply function |
|------|----------------|
| `sync` | `applyDataTheme("sync")` |
| `light` / `dark` | `applyDataTheme(mode)` |
| `custom` + curated | `applyCuratedTheme(id)` |
| `custom` + advanced | `applyAdvancedTheme(theme)` |
