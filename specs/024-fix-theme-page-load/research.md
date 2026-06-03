# Phase 0 Research: Fix Theme Application on Page Load

All technical unknowns from the plan's Technical Context are resolved below. No `NEEDS CLARIFICATION` remain.

## 1. Root cause — why links and buttons are wrong on load

**Decision**: The incomplete styling is a **timing bug**, not missing theme definitions. `useThemeSync` calls `theme-store.bootstrap()` inside `useEffect`, which runs **after** the browser's first paint. Until then:

- `:root` / `[data-theme="light"]` defaults in `themes.css` supply `--primary`, `--accent`, `--accent-foreground`, etc.
- Custom mode eventually sets `data-theme="custom"` but `[data-theme="custom"]` only defines `--now-playing-highlight`; semantic slots are written inline by `applyThemeColorSlots`—deferred.
- shadcn `Button` and navigation links consume `--primary` / `--accent` tokens, so they appear with default light styling while backgrounds may partially update.

**Rationale**: Confirmed by reading `frontend/src/hooks/use-theme-sync.ts`, `frontend/src/lib/theme-store.ts` (`bootstrap` in effect), and `frontend/src/styles/themes.css`.

**Alternatives considered**:
- Route-level CSS fixes per page — treats symptom, not cause. Rejected.
- CSS-only `:root` overrides for custom — cannot cover user advanced palettes. Rejected.

## 2. Early synchronous bootstrap pattern

**Decision**: Add `frontend/src/theme-boot-entry.ts` as a **separate Vite module script** in `index.html`, loaded **before** `main.tsx`. It imports `themes.css` and calls `bootstrapThemeFromStorage()` from new `theme-bootstrap.ts`. `main.tsx` calls the same function again before `createRoot` (idempotent guard prevents double DOM writes).

**Rationale**: Vite processes module scripts in document order before React mounts. Spec allows a brief blank splash but forbids wrong-color flash; applying theme before `createRoot` ensures the first React frame uses correct tokens. Avoids duplicating curated palettes in a hand-maintained inline IIFE and keeps a single TypeScript source of truth.

**Alternatives considered**:
- Inline non-module `<script>` in `index.html` with duplicated curated colors — DRY violation, drift risk. Rejected.
- `useLayoutEffect` only — still runs after first paint in concurrent React. Rejected.
- New Vite HTML plugin dependency — violates Constitution V without user request. Rejected.

## 3. Bootstrap function responsibilities

**Decision**: `bootstrapThemeFromStorage()` in `theme-bootstrap.ts`:

1. Run `runThemeMigration()` (move from `main.tsx`-only to shared boot path; idempotent).
2. Read and validate `themeMode`, `customSelection`, `customPresets`.
3. Apply theme via existing `theme-engine` exports (`applyDataTheme`, `applyCuratedTheme`, `applyAdvancedTheme`).
4. Return a `ThemeBootstrapResult` `{ themeMode, customSelection, advancedThemes, fallbackApplied, fallbackReason? }` for Zustand hydration.

Store `bootstrap()` becomes a thin wrapper: call shared function, `set()` result, skip re-apply if already bootstrapped in same session (module-level flag).

**Rationale**: Single apply path for load and store; tests target one module.

**Alternatives considered**:
- Duplicate apply logic in store — diverges from engine. Rejected.

## 4. Load-time fallback matrix (clarifications)

**Decision**:

| Condition | Action | Persist |
|-----------|--------|---------|
| `themeMode` unreadable / invalid JSON | Apply Sync (OS-resolved) | Set `themeMode` → `"sync"` |
| `customSelection` advanced id not in `customPresets` | Apply Sync | Set `themeMode` → `"sync"` |
| `customPresets` corrupt (non-array) | Apply Sync | Set `themeMode` → `"sync"` |
| Advanced theme found but colors invalid | Apply Sync | Set `themeMode` → `"sync"` |
| Advanced theme valid but supplementary rules fail sanitization | Apply semantic colors only; discard rules | No mode change |
| Curated id invalid | Apply Sync | Set `themeMode` → `"sync"` |
| Valid Custom curated / advanced | Full apply | No change |

Replaces current `resolveCustomSelection` repair-to-Warm-Tones behavior **at load time** per spec FR-009 / clarification session.

**Rationale**: Matches user clarifications; 021 storage-cleared parity for catastrophic failures.

**Alternatives considered**:
- Repair Custom selection to Warm Tones — explicitly rejected in clarification Q5. Rejected.

## 5. Sync mode on first apply

**Decision**: When `themeMode === "sync"`, bootstrap calls `applyDataTheme("sync", window.matchMedia("(prefers-color-scheme: dark)").matches)` synchronously—same as in-session behavior.

**Rationale**: FR-005 requires OS-resolved palette on first paint; no interim light default.

**Alternatives considered**:
- Default to light until effect runs — causes wrong-mode flash. Rejected.

## 6. Interaction with `useThemeSync`

**Decision**: Keep `useThemeSync` for:

- Subscribing to `prefers-color-scheme` changes when mode is Sync (existing effect).
- Calling store `bootstrap()` on mount **only to hydrate Zustand state** from `ThemeBootstrapResult`; guard prevents redundant DOM apply if boot entry already ran.

**Rationale**: Preserves live OS sync (FR-005 post-load) without regressing FR-007 in-session apply.

**Alternatives considered**:
- Remove `useThemeSync` bootstrap entirely — store would start with stale defaults until user interaction. Rejected.

## 7. PWA cold launch parity

**Decision**: No separate PWA bootstrap path. Installed PWA loads the same `index.html` → `theme-boot-entry.ts` → `main.tsx` chain. Workbox caches static assets; bootstrap reads `localStorage` at runtime each launch.

**Rationale**: SC-001 requires PWA standalone cold launch in acceptance matrix; same entry satisfies FR-001 without service-worker changes.

**Alternatives considered**:
- Service worker message to apply theme — unnecessary complexity. Rejected.

## 8. Testing strategy

**Decision**:

- Unit: `theme-bootstrap.test.ts` with `localStorage` mock + `document.documentElement` assertions for `--primary`, `data-theme`, supplementary `<style>` presence.
- Manual: [quickstart.md](./quickstart.md) — hard refresh + installed PWA cold launch per theme mode.
- Regression: existing `custom-theme-apply.test.ts`, theme-store in-session switch tests unchanged.

**Rationale**: Cold-load bug is best caught by bootstrap unit tests; visual QA confirms link/button surfaces.

**Alternatives considered**:
- Playwright E2E only — heavier than needed for this scope. Deferred to optional follow-up.
