# Implementation Plan: Fix Theme Application on Page Load

**Branch**: `024-fix-theme-page-load` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-fix-theme-page-load/spec.md`

## Summary

Themes partially apply on cold load because `theme-store.bootstrap()` runs inside `useThemeSync`'s `useEffect`—after the first paint—so `:root` / light defaults drive `--primary`, `--accent`, and link tokens until a deferred pass runs. Custom mode sets `data-theme="custom"` late while semantic CSS variables remain unset.

**Technical approach**: Extract a synchronous **`bootstrapThemeFromStorage()`** in `theme-bootstrap.ts` (shared by an early Vite module entry and `main.tsx`), invoked **before** `createRoot`. Align load-time validation/fallbacks with clarifications (corrupt data or missing advanced theme ID → Sync revert; invalid supplementary rules → semantic colors only). Keep `useThemeSync` for OS `prefers-color-scheme` live updates and Zustand hydration without re-introducing a visible flash.

## Technical Context

**Language/Version**: TypeScript (strict). Frontend React (Vite). No backend changes.

**Primary Dependencies**: Existing stack only—React, Zustand, `theme-engine.ts`, `curated-themes.ts`, `theme-supplementary.ts`, Vitest. No new libraries.

**Storage**: `localStorage` keys from `frontend/src/lib/local-storage.ts` (`themeMode`, `customSelection`, `customPresets`).

**Testing**: Vitest unit tests for `theme-bootstrap.ts` (cold-load scenarios, fallbacks, idempotency). Manual QA per [quickstart.md](./quickstart.md) including PWA standalone cold launch (SC-001).

**Target Platform**: Browser hard refresh and PWA standalone cold launch (Workbox via `vite-plugin-pwa`).

**Project Type**: Web application (`frontend/` only).

**Performance Goals**: Theme fully applied synchronously before first React commit; no visible mixed-state frame where backgrounds and interactive colors disagree.

**Constraints**: Must not regress in-session theme switch (FR-007); bootstrap must be idempotent when called from boot entry + `main.tsx` + store; Sync must resolve OS light/dark on first apply (FR-005).

**Scale/Scope**: ~6–8 frontend files touched; zero API changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass (no backend work) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass (no new UI components) |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | N/A |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ N/A |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass (theming fix only; no contrast policy change) |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass (bootstrap runs on same entry HTML for PWA) |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass (no layout changes) |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | N/A |

**Post-design re-check**: All gates still pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/024-fix-theme-page-load/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── theme-bootstrap.md
│   └── theme-load-fallbacks.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/
├── index.html                          # Add early theme-boot module script
├── src/
│   ├── theme-boot-entry.ts             # NEW: sync bootstrap before main bundle
│   ├── main.tsx                        # Call bootstrap before createRoot (idempotent)
│   ├── lib/
│   │   ├── theme-bootstrap.ts          # NEW: read storage + apply + fallbacks
│   │   ├── theme-engine.ts             # Existing apply functions (unchanged API)
│   │   ├── theme-store.ts              # Delegate bootstrap; Sync revert on bad refs
│   │   └── local-storage.ts            # Optional: validateThemeMode helper
│   └── hooks/
│       └── use-theme-sync.ts           # Hydrate store only; defer re-apply if already bootstrapped
└── tests/unit/
    └── theme-bootstrap.test.ts         # NEW: cold-load + fallback matrix
```

**Structure Decision**: Frontend-only bug fix. Centralize load-time logic in `theme-bootstrap.ts`; keep `theme-engine.ts` as the DOM mutation layer.

## Complexity Tracking

> No constitution violations. Section intentionally empty.

## Phase 0 — Research

See [research.md](./research.md). Resolves: root cause timing, early bootstrap entry pattern, fallback matrix from clarifications, idempotent boot sequence, PWA parity.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — bootstrap result type, validation rules, state transitions on load.
- [contracts/theme-bootstrap.md](./contracts/theme-bootstrap.md) — synchronous boot sequence and DOM effects.
- [contracts/theme-load-fallbacks.md](./contracts/theme-load-fallbacks.md) — failure-mode decision table (FR-009, FR-010).
- [quickstart.md](./quickstart.md) — manual verification mapped to user stories + PWA cold launch.
- Agent context: `.cursor/rules/specify-rules.mdc` SPECKIT block → this plan.

## Phase 2 — Tasks (out of scope for `/speckit-plan`)

Run `/speckit-tasks` to generate `tasks.md` from this plan and the spec.
