# Implementation Plan: Custom Themes

**Branch**: `021-custom-themes` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-custom-themes/spec.md`

## Summary

Expand **Custom** theme mode with three shipped curated palettes (Warm Tones, Retrowave, Elegant), an advanced editor (six semantic HSL slots + one supplementary rules textarea), import/export of advanced themes as versioned JSON files, and legacy preset migration that maps the last-active old preset to the nearest curated theme. All work is **frontend-only** (localStorage + CSS variables + optional `<style>` inject); no backend or PostgreSQL changes.

Technical approach: centralize apply/preview in `theme-engine.ts`, persist active `customSelection` separately from the advanced theme list (max 6), bootstrap via Zustand `theme-store` + existing `useThemeSync`, and validate theme packages with Zod (already in the monorepo).

## Technical Context

**Language/Version**: TypeScript (strict). Frontend React (Vite). No backend changes.

**Primary Dependencies**: React, Zustand (existing), shadcn/ui + Tailwind, Zod (existing), Sonner toasts. Native `<input type="color">` for pickers—no new color libraries.

**Storage**: `localStorage` keys in `frontend/src/lib/local-storage.ts`; ephemeral supplementary CSS via `#dexaudio-theme-supplement` in `document.head`.

**Testing**: Vitest unit tests in `frontend/tests/unit/` (theme-engine, theme-package, migration distance, cap enforcement, supplementary sanitizer).

**Target Platform**: Installable offline-first PWA; theme packages are local files (File API).

**Project Type**: Web application (`frontend/` only for this feature).

**Performance Goals**: Theme switch applies in one frame (sync CSS variable writes); supplementary inject < 16 KB parsed synchronously without perceptible UI hitch.

**Constraints**: Six advanced themes max; supplementary rules 16 KB; no contrast enforcement on user colors (FR-013); curated palettes should be QA'd for AA on default controls.

**Scale/Scope**: ~10–12 frontend files touched/added; Appearance settings UI refactor; zero API contract changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass (no backend work) |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass (localStorage only) |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass (`Button`, `Input`, `Label`, `Textarea`, `Card`, `Tabs` as needed) |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — `CuratedThemeCard` optional thin wrapper; prefer composition |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ N/A (no server surface) |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — labeled color inputs, keyboardable actions, focus visible; user theme colors exempt per FR-013 (see research §8) |
| Frontend is offline-first PWA | IV. Frontend Quality | ✅ Pass |
| Responsive layout supports 320 px+ | IV. Frontend Quality | ✅ Pass (settings section stacks) |
| No new libraries/services without explicit request | V. Simplicity & Restraint | ✅ Pass |
| New dependencies documented in Complexity Tracking | V. Simplicity & Restraint | N/A |

**Post-design re-check**: All gates still pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/021-custom-themes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── theme-package-v1.md
│   ├── theme-supplementary-rules.md
│   └── legacy-migration.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── lib/
│   ├── local-storage.ts              # Keys: customSelection, themeMigrationV1; extend types
│   ├── curated-themes.ts             # NEW: 3 built-in palette definitions
│   ├── theme-engine.ts               # NEW: apply curated/advanced, variable mapping
│   ├── theme-package.ts              # NEW: Zod schema, import/export
│   ├── theme-migration.ts            # NEW: legacy → curated (FR-016)
│   ├── theme-store.ts                # NEW: Zustand + persistence
│   └── custom-theme-presets.ts       # Deprecate/re-export; logic moves to theme-engine
├── hooks/
│   └── use-theme-sync.ts             # Integrate with theme-store bootstrap
├── components/settings/
│   ├── AppearanceSettingsSection.tsx # Wire mode buttons → store
│   ├── CustomThemeEditor.tsx         # Refactor → advanced editor + list actions
│   └── CuratedThemePicker.tsx        # NEW: 3 curated cards/buttons
├── styles/
│   └── themes.css                    # Optional [data-theme="custom"] defaults
└── main.tsx                          # Run theme-migration before render

frontend/tests/unit/
├── theme-engine.test.ts
├── theme-package.test.ts
├── theme-migration.test.ts
└── theme-supplementary.test.ts
```

**Structure Decision**: Frontend-only delta. Reuse existing Appearance entry point; replace ad-hoc DOM theme mutations with `theme-store` + `theme-engine`.

## Complexity Tracking

> No constitution violations. Section intentionally empty.

## Phase 0 — Research

See [research.md](./research.md). Resolves: CSS variable application, selection persistence, JSON package format, supplementary rule sanitization, legacy migration distance, color UX without new deps, Zustand reactivity, WCAG policy boundary.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — `CustomSelection`, `AdvancedTheme`, curated ids, migration flag.
- [contracts/theme-package-v1.md](./contracts/theme-package-v1.md) — import/export JSON v1.
- [contracts/theme-supplementary-rules.md](./contracts/theme-supplementary-rules.md) — 16 KB + blocklist.
- [contracts/legacy-migration.md](./contracts/legacy-migration.md) — deterministic nearest curated mapping.
- [quickstart.md](./quickstart.md) — manual verification mapped to user stories.
- Agent context: `.cursor/rules/specify-rules.mdc` SPECKIT block → this plan.

## Phase 2 — Tasks (out of scope for `/speckit-plan`)

Run `/speckit-tasks` to generate `tasks.md` from this plan and the spec.
