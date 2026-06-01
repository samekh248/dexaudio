# Quickstart: Custom Themes (manual verification)

**Branch**: `021-custom-themes`  
**Prereqs**: `cd frontend && npm run dev` (or installed PWA build)

## 1. Curated themes (P1)

1. Open **Settings → Appearance**.
2. Select **custom** mode.
3. Confirm three curated options: **Warm Tones**, **Retrowave**, **Elegant** with short descriptions.
4. Select **Warm Tones** → library and now playing use warm light surfaces (not default gray light).
5. Select **Retrowave** → dark base with vivid pink/blue accents on controls/highlights.
6. Select **Elegant** → restrained light neutrals (compare to Linear reference image if available).
7. Reload app → last curated choice still active.

## 2. Advanced editor (P2)

1. Choose **Create / edit advanced theme** (fourth path).
2. Change **Background** via color picker → UI updates live.
3. Type an invalid HSL in **Accent** → inline error; UI does not break.
4. Type valid HSL → live preview resumes.
5. Add supplementary rule `:root { --radius: 0.75rem; }` → preview shows change.
6. **Reset** → reverts to last saved; **Save** → persists after reload.

## 3. Duplicate curated → advanced (P4 / FR-011a)

1. With fewer than six advanced themes, click **Duplicate** on **Retrowave**.
2. Confirm new advanced theme `Retrowave (custom)` (or similar) with matching colors.
3. Edit accent, Save, switch away and back → edits persist.

## 4. Six-theme cap (P4)

1. Create/duplicate/import until six advanced themes exist.
2. Attempt seventh via duplicate → blocked with clear message.
3. Import valid package with new name → blocked.
4. Import with **Replace** on existing row → succeeds.

## 5. Import / export (P3)

1. Export an advanced theme → downloads `.dexaudio-theme.json`.
2. Delete that theme locally.
3. Import the file → theme restored and activatable.
4. With only curated active, Export → disabled or prompts to duplicate first.

## 6. Legacy migration (FR-016)

1. In devtools, seed legacy `localStorage` `dexaudio.customPresets` with a dark neon preset (or use pre-upgrade build).
2. Clear `dexaudio.themeMigrationV1`, reload.
3. Confirm toast about mapped curated theme; legacy keys removed; Custom mode active.

## 7. Regression checks

- **Sync / Light / Dark** modes still work; OS sync updates live.
- Playback continues through theme switch and import.
- Settings controls remain keyboard-focusable with visible focus.

## Automated tests

```bash
cd frontend && npm test -- theme-
```

Covers: HSL validation, package round-trip, migration distance, supplementary blocklist, cap enforcement.
