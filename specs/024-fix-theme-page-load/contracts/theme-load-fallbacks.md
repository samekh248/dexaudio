# Contract: Theme Load Fallbacks

**Feature**: 024-fix-theme-page-load  
**Requirements**: FR-009, FR-010

Decision table for load-time failures. All Sync fallbacks apply the **complete** built-in palette (structural + interactive colors).

## Fallback matrix

| # | Trigger | Visual result | Persist | User notice |
|---|---------|---------------|---------|-------------|
| F1 | `localStorage` read throws | Sync (OS-resolved) | `themeMode → sync` | None |
| F2 | `themeMode` key missing | Normal read path (default `"sync"`) | None | None |
| F3 | `themeMode` invalid string | Sync | `themeMode → sync` | None |
| F4 | `customPresets` not an array / parse error | Sync | `themeMode → sync` | None |
| F5 | Custom + advanced `customSelection.id` not found | Sync | `themeMode → sync` | None |
| F6 | Custom + invalid curated id | Sync | `themeMode → sync` | None |
| F7 | Advanced theme colors fail `areThemeColorsValid` | Sync | `themeMode → sync` | None |
| F8 | Advanced theme valid; supplementary rules fail sanitization | Custom semantic colors only | None | None (silent discard) |
| F9 | Advanced theme valid; empty supplementary rules | Full Custom apply | None | None |

## Distinction from 021 in-session behavior

| Scenario | Load (this feature) | In-session (021, unchanged) |
|----------|---------------------|------------------------------|
| Missing advanced id while Custom | **Sync revert** (F5) | N/A at runtime if user deletes theme while active—handled by store delete flow |
| Invalid supplementary on Save | N/A at load | Editor shows error on Save |
| Storage cleared | Sync (021) | Sync (021) |

## Test vectors (unit)

Each row F1–F8 MUST have at least one Vitest case seeding `localStorage` and asserting:

- `data-theme` value
- `--primary` / `--accent` match expected Sync or Custom palette
- `fallbackApplied` flag on result object where applicable

## Acceptance mapping

- **SC-001**: Matrix includes browser hard refresh + PWA standalone for Sync, Light, Dark, each curated theme, ≥2 advanced themes (with and without supplementary rules).
- **SC-004**: After successful load (no fallback), navigation must not introduce mixed styling.
