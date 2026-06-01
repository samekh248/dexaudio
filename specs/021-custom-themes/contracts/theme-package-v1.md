# Contract: Theme Package v1 (client-only)

**Feature**: 021-custom-themes  
**Type**: Import/export file format (no HTTP endpoint)

## File conventions

| Property | Value |
|----------|--------|
| MIME | `application/json` |
| Extension | `.dexaudio-theme.json` |
| Max size | 32 KB total file (16 KB `supplementaryRules` + metadata/colors) |

## JSON schema (informal)

```json
{
  "dexaudioTheme": 1,
  "name": "My Night Drive",
  "colors": {
    "background": "222 47% 6%",
    "surface": "222 47% 9%",
    "primaryText": "210 40% 98%",
    "secondaryText": "215 20% 65%",
    "accent": "280 80% 60%",
    "nowPlayingHighlight": "330 90% 65%"
  },
  "supplementaryRules": ":root { --radius: 0.75rem; }"
}
```

### Field rules

| Field | Rules |
|-------|--------|
| `dexaudioTheme` | MUST equal `1`; otherwise reject import |
| `name` | Non-empty string, max 64 chars after trim |
| `colors.*` | Each MUST match `/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/` (HSL components) |
| `supplementaryRules` | Optional; if present, subject to [theme-supplementary-rules.md](./theme-supplementary-rules.md) |

## Import behavior

| Condition | Behavior |
|-----------|----------|
| Valid file, count < 6, name unique | Add theme, activate, toast success |
| Valid file, count < 6, name collision | Prompt: Rename (default `name (imported)`) / Replace existing / Cancel |
| Valid file, count = 6, name collision with replace target | Replace after confirm |
| Valid file, count = 6, net-new name | Block with cap message |
| Invalid JSON / schema | Error toast; active theme unchanged |
| `dexaudioTheme` > 1 | Error: unsupported version (forward-compatible message) |

## Export behavior

- Export button enabled only when active selection is `kind: "advanced"` OR user exports a specific advanced row from list.
- Curated selection: export disabled; show hint “Duplicate this theme to customize and export.”
- Download filename: `{slugified-name}.dexaudio-theme.json`

## Zod contract location (implementation)

Define `ThemePackageV1Schema` in `frontend/src/lib/theme-package.ts` (co-located with import/export helpers). No `shared-types` change (no server involvement).
