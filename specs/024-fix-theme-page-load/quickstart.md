# Quickstart: Fix Theme Application on Page Load

**Branch**: `024-fix-theme-page-load`  
**Prereqs**: `cd frontend && npm run dev` (or production / installed PWA build)

## Automated tests

```bash
cd frontend && npm test -- theme-bootstrap
cd frontend && npm test -- custom-theme-apply
```

## 1. Custom curated — first paint (P1 / FR-001–003)

1. Open **Settings → Appearance** → **Custom** → select **Retrowave**.
2. Note button and link colors on Settings (e.g., primary buttons, navigation links).
3. **Hard refresh** (Ctrl+Shift+R / Cmd+Shift+R).
4. **Pass**: On first visible frame, buttons and links match Retrowave accents—not default gray/light primary colors.
5. Repeat for **Warm Tones** and **Elegant**.

## 2. Custom advanced + supplementary rules (P1 / FR-004)

1. Duplicate **Retrowave** to advanced; add supplementary rule targeting `[data-theme="custom"]` with a distinctive `--radius` or accent override.
2. Save and activate.
3. Hard refresh.
4. **Pass**: Six semantic colors + valid supplementary rules present on first paint; links/buttons styled correctly.

## 3. Built-in modes (P1 / FR-005)

1. Set **Dark** → hard refresh → entire UI including buttons/links dark on first frame.
2. Set **Light** → hard refresh → full light palette on first frame.
3. Set **Sync** with OS dark mode → hard refresh → dark Sync palette immediately (no light flash).
4. Toggle OS appearance after load → Sync updates live without manual toggle.

## 4. Cross-surface consistency (P2 / FR-008)

1. With distinctive Custom theme active, hard refresh on **library** home.
2. Navigate: library → album detail → **Settings** → **Now Playing** (no Appearance visit).
3. **Pass**: Link and button colors consistent on every surface.

## 5. In-session switch regression (P3 / FR-007, SC-005)

1. Switch from Warm Tones to Retrowave in Appearance.
2. **Pass**: Full update within one click including links/buttons.
3. Hard refresh → new theme loads completely on first paint.

## 6. Fallback scenarios (FR-009, FR-010)

**Missing advanced theme (F5)**:

1. Set Custom + an advanced theme active.
2. DevTools → Application → Local Storage: delete the matching preset from `dexaudio.customPresets` but leave `customSelection` pointing at removed id.
3. Hard refresh.
4. **Pass**: App loads in complete **Sync** styling; `dexaudio.theme.mode` persisted as `sync`.

**Invalid supplementary rules (F8)**:

1. DevTools: edit active advanced theme JSON; set `supplementaryRules` to `@import url(evil)`.
2. Hard refresh.
3. **Pass**: Semantic colors apply; links/buttons correct; no supplement style block; no Sync revert.

## 7. PWA standalone cold launch (SC-001)

1. Build and install PWA (`npm run build && npm run preview` or deployed build).
2. Close all app instances.
3. Launch from home screen / installed app icon (cold start).
4. Repeat steps 1–3 for at least: Sync, Dark, one curated Custom, one advanced theme.
5. **Pass**: First interactive frame shows correct link/button colors without visiting Settings.

## 8. Side-by-side QA (SC-003)

For each saved preference:

1. Capture screenshot immediately after hard refresh (first paint).
2. Open Appearance, re-select same theme without changing it.
3. **Pass**: No distinguishable difference in link/button styling between the two captures.

## Failure signals (stop and file bug)

- Background/surface colors correct but buttons or links use default light `--primary` after refresh.
- Visible flash: wrong interactive colors then correction after ~1s.
- Sync mode shows light palette flash on OS-dark before correcting.
- PWA cold launch behaves differently from browser hard refresh for the same saved theme.
