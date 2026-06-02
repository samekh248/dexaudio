# Phase 0 Research: Persist Theme Preference

**Feature**: 023-persist-theme-preference  
**Date**: 2026-06-01

## 1. Root cause: why theme “resets” on refresh

**Decision**: The primary bug is **late hydration**—theme is only applied inside `useThemeSync` → `useEffect` → `theme-store.bootstrap()`, which runs **after** the first React paint. Until then, Zustand defaults (`themeMode: "sync"`) and CSS `:root` light tokens from `themes.css` are shown.

**Rationale**: `main.tsx` already calls `runThemeMigration()` synchronously before `createRoot`, but does **not** apply the persisted mode/selection to the DOM. Playback prefs and session restore follow a similar “bootstrap before render” pattern (`bootstrapPlaybackSession()` in `App.tsx` module scope).

**Alternatives considered**:
- *Inline `<script>` in `index.html`* — strongest FOUC prevention; rejected for v1 because duplicating theme-engine logic in non-module JS increases drift risk. Revisit only if SC-004 (95% first-paint) fails after synchronous TS hydration in `main.tsx`.
- *Service worker cache of theme* — unnecessary; preference is localStorage, not network.

## 2. Synchronous hydration entry point

**Decision**: Add `hydrateThemeFromStorage()` in `frontend/src/lib/theme-hydration.ts` that:
1. Runs after `runThemeMigration()` in `main.tsx`.
2. Reads `themeMode`, `customSelection`, and advanced theme list via existing `local-storage` helpers.
3. Applies DOM via existing `theme-engine` (`applyDataTheme`, `applyCuratedTheme`, `applyAdvancedTheme`).
4. Is idempotent and safe when `localStorage` is empty (falls back to **sync** per spec clarifications).

`theme-store.bootstrap()` MUST delegate to the same reconciliation logic so React state and DOM never diverge.

**Rationale**: Single source of truth for read → validate → apply → persist corrections.

**Alternatives considered**:
- *Only fix Zustand initial state from localStorage* — insufficient; DOM `data-theme` and CSS variables would still be wrong until effect runs.

## 3. Invalid / stale preference reconciliation (FR-008, FR-009)

**Decision**: Replace `resolveCustomSelection` fallback behavior:

| Condition | Current behavior | New behavior |
|-----------|------------------|--------------|
| Missing/corrupt `themeMode` | Default `"sync"` via `getItem` | Keep sync |
| Invalid `themeMode` enum | Treated as stored string | Coerce to **sync**, persist fix |
| `custom` + advanced id not found | Fall back to `themes[0]` or Warm Tones curated | Switch to **`sync`**, persist `themeMode: sync`, clear invalid active advanced reference from driving UI (other advanced themes remain in list) |
| `custom` + invalid curated id | Undefined | Fall back to **sync** (same as corrupt) |
| User deletes active advanced theme | `deleteAdvanced` picks `nextThemes[0]` | **`applyMode("sync")`** per clarification session |

**Rationale**: Matches spec clarifications Q2–Q3; avoids silent theme changes users did not choose.

**Alternatives considered**:
- *Auto-pick first advanced theme* — rejected by user clarification.
- *Auto-pick Warm Tones* — rejected for deleted-advanced recovery (only used when user explicitly enters custom without selection, if ever).

## 4. Persistence write path audit

**Decision**: No new storage keys. Verify existing write paths already call `setItem(StorageKeys.themeMode, …)` on `applyMode`, `applyCurated`, `selectAdvanced`, import, etc. Add regression tests that set each mode, simulate reload via `hydrateThemeFromStorage()`, and assert DOM + stored keys.

**Rationale**: Spec FR-007; bug may be read/apply timing only, but audit prevents partial writes.

## 5. First-paint / flash (FR-004, SC-004)

**Decision**: Synchronous hydration in `main.tsx` before `createRoot`, importing `themes.css` before hydration (already imported). Measure with manual hard-refresh checklist in quickstart.

**Rationale**: Aligns with 95% first-paint goal without index.html duplication.

## 6. Upgrade / migration (FR-006)

**Decision**: Reuse `runThemeMigration()` (021); hydration runs **after** migration. No new migration version unless audit finds a gap in `themeMigrationV1` flag handling.

**Rationale**: Spec assumes existing migration is sufficient; this feature fixes apply timing and invalid-reference policy.

## 7. Multi-tab consistency

**Decision**: Defer `storage` event listener; spec accepts eventual consistency on reload. Optional follow-up not in scope.

## 8. Testing strategy

**Decision**:
- Unit: `theme-hydration.test.ts` — all modes, corrupt keys, missing advanced id, deleted-theme simulation.
- Unit: update `theme-store` tests for `deleteAdvanced` → sync.
- Extend `local-storage-theme.test.ts` for valid mode enum guard.

**Rationale**: Vitest + jsdom `localStorage` matches existing frontend tests; no Playwright required for plan phase.

## 9. Constitution / dependencies

**Decision**: Frontend-only; no new npm packages; reuse Zustand, theme-engine, local-storage.

**Rationale**: Principle V (Simplicity); same pattern as 013/021 client prefs.
