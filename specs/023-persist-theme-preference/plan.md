# Implementation Plan: Persist Theme Preference

**Branch**: `023-persist-theme-preference` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-persist-theme-preference/spec.md`

## Summary

Fix theme “reset on refresh” by **hydrating appearance from `localStorage` synchronously before the first React paint**, sharing one reconciliation path with `theme-store.bootstrap()`. Align invalid/stale preference recovery with clarifications: default and repair target is **system sync**; deleting the active advanced theme switches to sync without auto-picking another advanced theme. Frontend-only; no API or database changes.

## Technical Context

**Language/Version**: TypeScript (strict). React (Vite). No backend changes.

**Primary Dependencies**: Existing Zustand `theme-store`, `theme-engine`, `local-storage`, `theme-migration` (021). No new npm packages.

**Storage**: `localStorage` keys `dexaudio.theme.mode`, `dexaudio.theme.customSelection`, `dexaudio.customPresets` (see [contracts/appearance-preference.md](./contracts/appearance-preference.md)).

**Testing**: Vitest unit tests in `frontend/tests/unit/` (`theme-hydration.test.ts`, updates to `theme-store` / `local-storage-theme` tests).

**Target Platform**: Installable offline-first PWA (browser profile–scoped persistence).

**Project Type**: Web application (`frontend/` only).

**Performance Goals**: Correct `data-theme` and CSS variables on first paint after synchronous hydration (SC-004: ≥95% manual checks without wrong-mode flash).

**Constraints**: Must not break 021 custom themes, migration, or supplementary rules inject. Multi-tab live sync deferred (reload consistency sufficient).

**Scale/Scope**: ~4–6 files touched, 1 new module, zero REST changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass (no backend work) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass (localStorage only) |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass (no new UI) |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | N/A |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ N/A |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass (no visual control changes) |
| Frontend is offline-first PWA | IV. Frontend Quality | ✅ Pass |
| Responsive layout supports 320 px+ | IV. Frontend Quality | ✅ Pass |
| No new libraries/services without explicit request | V. Simplicity & Restraint | ✅ Pass |
| New dependencies documented in Complexity Tracking | V. Simplicity & Restraint | N/A |

**Post-design re-check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/023-persist-theme-preference/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── appearance-preference.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
frontend/src/
├── main.tsx                          # hydrateThemeFromStorage() before createRoot
├── lib/
│   ├── theme-hydration.ts            # NEW: sync reconcile + apply
│   ├── theme-store.ts                # delegate bootstrap; fix deleteAdvanced
│   ├── theme-engine.ts               # unchanged apply helpers
│   ├── local-storage.ts              # optional: validateThemeMode helper
│   └── theme-migration.ts            # unchanged; runs before hydration
├── hooks/
│   └── use-theme-sync.ts             # bootstrap aligns Zustand only
└── tests/unit/
    ├── theme-hydration.test.ts       # NEW
    └── theme-store.test.ts           # extend delete/hydrate cases (if missing, add)

```

**Structure Decision**: Frontend-only bug fix on existing theme stack from 021. Single new module (`theme-hydration.ts`) centralizes load-time behavior.

## Complexity Tracking

> No constitution violations. Section intentionally empty.

## Phase 0 — Research

See [research.md](./research.md). Resolves: late hydration root cause, synchronous boot order, invalid advanced → sync policy, delete-active behavior, FOUC mitigation without index.html script, test approach.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — validation rules P1–P7, hydration result, state transitions.
- [contracts/appearance-preference.md](./contracts/appearance-preference.md) — storage keys, invariants, boot order.
- [quickstart.md](./quickstart.md) — manual verification for US1–US3 and edge cases.
- Agent context: `.cursor/rules/specify-rules.mdc` SPECKIT block → this plan.

## Implementation Notes (for `/speckit-tasks`)

1. Extract `reconcileAppearancePreference()` from store logic — returns effective `themeMode`, `customSelection`, `repaired`.
2. Implement `hydrateThemeFromStorage()` using reconcile + `theme-engine` apply + persist repairs.
3. `main.tsx`: `runThemeMigration(); hydrateThemeFromStorage(); createRoot(...)`.
4. Refactor `theme-store.bootstrap()` to call shared reconcile (avoid double-apply drift).
5. `deleteAdvanced`: when removing active theme → `applyMode("sync")` instead of `nextThemes[0]`.
6. Tests cover: each mode refresh simulation, corrupt mode, missing advanced id, delete-active → sync.

## Phase 2

**Out of scope for `/speckit-plan`.** Run `/speckit-tasks` to generate `tasks.md`.
