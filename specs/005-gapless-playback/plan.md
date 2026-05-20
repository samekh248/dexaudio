# Implementation Plan: Gapless Playback

**Branch**: `005-gapless-playback` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-gapless-playback/spec.md`

## Summary

Deliver opt-in gapless queue transitions by combining (1) a **bidirectional priority pre-cache** (next → previous → second-ahead → two-behind) built on the existing IndexedDB pre-cache worker, (2) **staged `Howl` instances** in `use-player.ts` so forward/backward handoffs avoid `unload()`-before-load dead air, (3) a **Settings toggle** with crossfade mutual exclusion and Sonner notices, and (4) **protected-key cache eviction** so gapless slots can displace lower-priority pre-cache entries but never pinned permanent cache. No backend changes.

## Technical Context

**Language/Version**: TypeScript 5.x strict on both tiers; React 19.x (latest stable); Node.js 22.x LTS; PostgreSQL 16+ (unchanged)

**Primary Dependencies**:
- **Frontend**: Vite, React 19, React Router 7, Howler.js 2.2.x, TanStack Query, Zustand (`playback-queue-store`), shadcn/ui (`Switch`, `Label`, Sonner `toast`), Tailwind CSS, Vitest + Testing Library
- **Backend**: Fastify 5 (no changes this feature)
- **Shared**: `packages/shared-types` — optional Zod mirror of client preference shape (only if tasks need shared validation); no new REST schemas required

**Storage**: IndexedDB audio cache (existing) + `localStorage` for `gaplessPlayback` preference. No new PostgreSQL tables.

**Testing**: Vitest in `frontend/` — unit tests for priority slot builder, protected LRU eviction, gapless handoff logic (mocked Howl); manual SC-001/SC-002 playlist check per [quickstart.md](./quickstart.md)

**Target Platform**: Modern Chromium/Firefox/Safari desktop; installable PWA; responsive 320 px → desktop

**Project Type**: Web application monorepo (frontend-only implementation scope)

**Performance Goals**:
- SC-001 — ≥95% forward transitions without perceptible gap (gapless on, normal network)
- SC-002 — median end→start &lt;50 ms on forward natural advance
- SC-003 — gapless off: no regression vs current transition timing
- SC-006 — zero new silent-failure cases (reuse 004 error paths)

**Constraints**:
- No new npm dependencies (Howler, Sonner, existing cache stack)
- No REST/API changes ([contracts/playback-preferences.yaml](./contracts/playback-preferences.yaml))
- Silent degrade on preparation timeout (no gapless-specific toast)
- Crossfade and gapless mutually exclusive (FR-011)
- Constitution Principle V: extend `pre-cache-worker` / `use-player` rather than new audio stack

**Scale/Scope**: Single listener; queue up to ~500 items; four neighbor slots × ~50 MB FLAC worst case bounded by existing pre-cache GB cap

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass — existing stack |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — no backend edits |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — no DB changes |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — `Switch` + Sonner toast for mutex notices |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — no new visual components |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — stream endpoint unchanged |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ N/A — client-only preference contract; no new HTTP shapes |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — labeled toggle, toast announcements via Sonner live region |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — gapless handoff uses cached blobs when present |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — Settings section only change |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass — zero new dependencies |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass — nothing to document |

**Post-design re-check** (after Phase 1): All gates remain ✅. Feature is a focused extension of existing player and cache modules.

## Project Structure

### Documentation (this feature)

```text
specs/005-gapless-playback/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── playback-preferences.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/settings/
│   │   └── PlaybackSettingsSection.tsx    # Modified — gapless toggle, crossfade mutex + toast
│   ├── hooks/
│   │   └── use-player.ts                  # Modified — staged Howl, gapless handoff, preload API
│   ├── lib/
│   │   ├── local-storage.ts               # Modified — StorageKeys.gaplessPlayback
│   │   ├── pre-cache-worker.ts            # Modified — priority bidirectional pre-cache
│   │   ├── gapless-cache-slots.ts         # New — build ordered neighbor slots from queue index
│   │   ├── cache-lru.ts                   # Modified — protected-key eviction ordering
│   │   └── cache-service.ts               # Modified — ensurePreCacheSpace(protectedKeys)
│   ├── pages/
│   │   └── NowPlayingPage.tsx             # Modified — gapless onend, preload on index change,
│   │                                        #   Previous/Next use player handoff helpers
│   └── contexts/
│       └── player-context.tsx               # Unchanged surface (if types need export, extend here)
└── tests/
    └── unit/
        ├── gapless-cache-slots.test.ts      # New
        ├── cache-lru-protected.test.ts      # New
        ├── pre-cache-gapless-priority.test.ts # New
        └── use-player-gapless-handoff.test.ts # New

backend/                                   # No changes
packages/shared-types/                     # Optional — no change unless tasks add Zod export
```

**Structure Decision**: Frontend-only diff in existing audio/cache/settings paths. Largest changes: `use-player.ts` (staged instances + handoff) and `pre-cache-worker.ts` (priority queue). Backend and PostgreSQL untouched.

## Complexity Tracking

No constitution violations. No new dependencies.

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

1. **Preference storage**: Add `StorageKeys.gaplessPlayback`; default `false`; read in player, pre-cache, and Settings.
2. **Gapless slot builder**: New `gapless-cache-slots.ts` — compute indices for priorities 1–4 from `currentIndex` + queue length.
3. **Priority pre-cache worker**: Refactor `pre-cache-worker.ts` — serial fetch in priority order when gapless on; retain forward-only path when off; `max(lookAhead, 2)` forward depth when on.
4. **Protected eviction**: Update `cache-lru.ts` + `cache-service.ts` to accept `protectedKeys` and evict non-neighbor pre-cache first.
5. **Staged Howl**: Extend `use-player.ts` with `preloadForward` / `preloadBackward`, promotion on handoff, generation-token cancellation.
6. **NowPlayingPage wiring**: On track/index change, run gapless pre-cache + preload; on natural end call gapless handoff then `next()`; Next/Previous use handoff when target matches staged track.
7. **Settings mutex**: Gapless ↔ crossfade toggle interaction + Sonner copy per FR-011.
8. **Tests**: Slot ordering, eviction priority, handoff vs fallback mocks.

**Next command**: `/speckit-tasks` to generate dependency-ordered `tasks.md`.
