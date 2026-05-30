# Implementation Plan: Play Navigation Preference

**Branch**: `013-play-navigation-preference` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-play-navigation-preference/spec.md`

## Summary

Add a **Settings → Playback** preference (**Go to Now Playing** vs **Stay on current page**). Persist in `localStorage`, read in the centralized `usePlayNow` hook, and conditionally call `navigate("/now-playing")`. Default **Go to Now Playing** preserves today’s behavior. All current and future callers of `usePlayNow` inherit the setting automatically. Stay mode shows no toast—only audio and the header playing-state visualizer (FR-009). Session restore on reload never auto-navigates (FR-010). Frontend-only; no backend changes.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19.x (latest stable); Node.js 22.x LTS; PostgreSQL 16+ (unchanged)

**Primary Dependencies**:
- **Frontend**: Vite, React 19, React Router 7, Zustand (`playback-queue-store`), shadcn/ui (`Label`, `RadioGroup` via CLI), Tailwind CSS, Vitest + Testing Library
- **Backend**: Fastify 5 (no changes)
- **Shared**: `packages/shared-types` — optional type export for `PlayNavigationMode`; no new REST schemas

**Storage**: `localStorage` key `dexaudio.playback.playNavigation`. No PostgreSQL or IndexedDB changes.

**Testing**: Vitest — `usePlayNow` navigate vs stay; preference fallback; no toast in stay mode; session bootstrap unchanged (no navigation)

**Target Platform**: Modern Chromium/Firefox/Safari desktop; installable PWA; responsive 320 px → desktop

**Project Type**: Web application monorepo (frontend-only scope)

**Performance Goals**: Synchronous preference read; zero added latency on play-now

**Constraints**:
- Single choke point: `usePlayNow` only (FR-004/005, clarified scope)
- No toast on stay mode (FR-009)
- `bootstrapPlaybackSession` unchanged — no route change on restore (FR-010)
- No new npm packages beyond shadcn `radio-group` via CLI
- No REST/API changes

**Scale/Scope**: One enum preference; ~5 source files; hook covers all play-now entry points including future UI (e.g. search)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — no backend edits |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — `RadioGroup` |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A — client-only contract |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — labeled radio group |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass |

**Post-design re-check**: All gates remain ✅.

## Project Structure

### Documentation (this feature)

```text
specs/013-play-navigation-preference/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── playback-preferences.yaml
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── settings/
│   │   │   └── PlaybackSettingsSection.tsx    # Radio group for play navigation
│   │   └── ui/
│   │       └── radio-group.tsx                # shadcn CLI
│   ├── hooks/
│   │   └── use-play-now.ts                    # Conditional navigate; no toast in stay
│   └── lib/
│       └── local-storage.ts                   # StorageKeys.playNavigation + getter
└── tests/
    └── unit/
        ├── use-play-now.test.tsx
        └── use-play-album.test.tsx            # Update navigate assertions

backend/                                       # No changes
```

**Structure Decision**: Frontend-only. `playback-bootstrap.ts` explicitly **not** modified (session restore out of scope per FR-010).

## Complexity Tracking

No constitution violations.

| Violation / exception | Why Needed | Simpler Alternative Rejected Because |
|----------------------|------------|--------------------------------------|
| *(none)* | — | — |

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | ✅ Complete |
| Data model | [data-model.md](./data-model.md) | ✅ Complete |
| Client contract | [contracts/playback-preferences.yaml](./contracts/playback-preferences.yaml) | ✅ Complete |
| Quickstart | [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Phases (high level — detail in tasks.md)

### Phase 2+ (out of scope for `/speckit-plan`)

1. **Storage**: `StorageKeys.playNavigation`, `getPlayNavigationMode()` with `"navigate"` fallback.
2. **Hook**: `usePlayNow` — navigate only when mode is `"navigate"`; never toast (FR-009).
3. **Settings**: Radio group in `PlaybackSettingsSection`.
4. **shadcn**: Add `radio-group` component.
5. **Tests**: Hook modes; confirm `bootstrapPlaybackSession` does not gain navigation.
6. **Do not touch**: `playback-bootstrap.ts`, `addToQueue`, queue `setIndex`.

**Next command**: `/speckit-tasks`
