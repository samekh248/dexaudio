# Contract: Theme Bootstrap (load-time)

**Feature**: 024-fix-theme-page-load  
**Scope**: Client-only synchronous theme application before first React paint

## Entry points

| Entry | When | Must call |
|-------|------|-----------|
| `theme-boot-entry.ts` | First module script in `index.html` (before `main.tsx`) | `bootstrapThemeFromStorage()` |
| `main.tsx` | Before `createRoot` | `bootstrapThemeFromStorage()` (idempotent) |
| `theme-store.bootstrap()` | React mount via `useThemeSync` | Shared bootstrap + Zustand `set()` only |

## `bootstrapThemeFromStorage()` contract

**Module**: `frontend/src/lib/theme-bootstrap.ts`

**Preconditions**:

- `window` and `document` available (browser / PWA).
- `localStorage` readable (try/catch; failure → Sync revert).

**Postconditions** (on success path):

1. `document.documentElement` has correct `data-theme` attribute.
2. For Custom mode: all six semantic CSS variables set on `:root`; `--primary` and `--accent` reflect active theme (buttons/links correct).
3. Supplementary rules: injected only when sanitization passes; otherwise `#dexaudio-theme-supplement` absent or cleared.
4. For Sync: resolved light/dark matches `prefers-color-scheme` at call time.
5. Function is **idempotent**: second call in same page load produces no visible DOM change.

**Returns**: `ThemeBootstrapResult` (see [data-model.md](../data-model.md)).

**Side effects on fallback** (FR-009):

- Persist `StorageKeys.themeMode = "sync"`.
- Do not repair Custom selection in place.

## DOM inspection (QA / tests)

After bootstrap, before React render:

```js
// Custom curated example (Retrowave)
document.documentElement.getAttribute("data-theme") === "custom"
getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() !== "" // non-default accent
```

Compare `--primary` / `--accent` values after cold load vs after in-session theme re-select in Appearance—they MUST match for the same saved preference (SC-003).

## Non-goals

- No change to theme package import/export format (021).
- No new public API endpoints.
- No change to in-session `applyMode` / `applyCurated` / `selectAdvanced` store methods beyond shared validation helpers.
