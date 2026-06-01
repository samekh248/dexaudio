# Contract: Legacy Custom Preset Migration

**Feature**: 021-custom-themes  
**Trigger**: First app boot after upgrade when `StorageKeys.customPresets` has length > 0 and `StorageKeys.themeMigrationV1` is unset.

## Inputs

| Input | Source |
|-------|--------|
| Legacy presets | `getCustomPresets()` (array) |
| Last-active preset id | `StorageKeys.customPresetId` if valid, else `presets[0].id` |

## Algorithm

1. Let `P` = preset matching last-active id.
2. For each `curatedId` in `["warm-tones", "elegant", "retrowave"]`, compute  
   `distance(P, curatedId) = euclidean3(hslNorm(P.background), hslNorm(C.background)) + same for surface + accent`  
   where `hslNorm` parses `"H S% L%"` to `(H/360, S/100, L/100)`.
3. Choose curated id with minimum distance; ties → `warm-tones`, then `elegant`, then `retrowave`.
4. Write:
   - `themeMode = "custom"`
   - `customSelection = { kind: "curated", id: winner }`
   - `themeMigrationV1 = true`
5. Remove `customPresets`, `customPresetId`.
6. Ensure at least one default advanced theme exists (seed empty advanced list with `DEFAULT_ADVANCED_THEME`).
7. Show one-time toast: mapped theme name + link hint to duplicate curated.

## Test vectors (unit tests)

| Legacy palette character | Expected winner |
|--------------------------|-----------------|
| Dark gray-violet bg, neon pink accent | `retrowave` |
| Cream/beige bg, brown-muted accent | `warm-tones` |
| White/soft gray bg, subtle blue-gray accent | `elegant` |

Exact numeric fixtures to be recorded in `frontend/tests/unit/theme-migration.test.ts` during implementation.

## Non-goals

- Do not preserve legacy preset colors in advanced storage.
- Do not import legacy files as theme packages.
