# Quickstart: Persist Theme Preference (Feature 023)

## What This Feature Fixes

Appearance choice (sync, light, dark, or a specific custom theme) **sticks** across page refresh, new browser sessions, and app upgrades. Invalid stored references recover to **system sync**, not a random other theme.

## Prerequisites

- Custom themes (021) merged
- Node.js 22 LTS; `npm install` at repo root

## Dev Setup

```bash
cd backend && npm run dev &
cd frontend && npm run dev &
```

## Key Files (planned)

| File | Role |
|------|------|
| `frontend/src/lib/theme-hydration.ts` | **NEW** — sync read/validate/apply before React |
| `frontend/src/main.tsx` | Call `hydrateThemeFromStorage()` after migration |
| `frontend/src/lib/theme-store.ts` | Shared reconciliation; `deleteAdvanced` → sync |
| `frontend/src/hooks/use-theme-sync.ts` | `bootstrap()` aligns store only |
| `frontend/tests/unit/theme-hydration.test.ts` | **NEW** — reload simulation |

## Manual Smoke Test (maps to spec user stories)

### US1 — Page refresh (P1)

1. **Light** — Settings → Appearance → Light → hard refresh (Ctrl+Shift+R). Expect Light active; settings show Light selected.
2. **Dark** — repeat for Dark.
3. **Sync** — select system sync → refresh → still sync.
4. **Curated** — Custom → Warm Tones → refresh → Warm Tones visible on library + settings.
5. **Advanced** — select a saved advanced theme → refresh → same colors/supplementary rules.
6. **Deleted active advanced** — with advanced theme active, delete it → refresh → **system sync** active; other advanced themes still listed, none auto-applied.

### US2 — New session (P2)

1. Set Retrowave curated → quit browser completely → reopen app URL → Retrowave still active.

### US3 — Upgrade (P3)

1. With Dark saved, deploy/pull new build → open app → still Dark (or documented migration outcome).
2. Clear site data → open app → **system sync** default.

### Edge — Storage blocked

1. Private/incognito window → select Dark → close tab → reopen (if storage cleared) → sync default, no crash.

## Automated Tests

```bash
cd frontend && npm test -- theme-hydration
```

## Success Criteria Check

| ID | Quick check |
|----|-------------|
| SC-001 | All modes + curated + advanced survive hard refresh |
| SC-002 | Theme survives browser restart same profile |
| SC-003 | Theme survives build upgrade with storage intact |
| SC-004 | Change theme → refresh within 5s → correct look on first paint (no obvious flash to wrong mode) |
| SC-005 | No “resets on refresh” reports after release |
