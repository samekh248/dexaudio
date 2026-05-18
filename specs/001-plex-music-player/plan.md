# Implementation Plan: Plex Music Player with Discogs Collection Sync

**Branch**: `001-plex-music-player` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-plex-music-player/spec.md`

**User stack directive** (from `/speckit-plan`): React (latest stable) + TypeScript + `localStorage` for client preferences; backend Node.js (latest stable LTS) + TypeScript; PostgreSQL; shadcn/ui for UI; frontend ↔ backend via versioned REST (`/api/v1/…`) with **optional** GraphQL as a secondary API surface; unit tests on frontend and backend targeting **80%** line coverage.

## Summary

Build a **PWA-capable web music player** (installable desktop wrapper) that streams FLAC/MP3 from a user-configured Plex server, supports album-centric browsing, playback queue with Plex radio auto-queue, dual-tier on-device audio caching, last.fm scrobbling, Plex-sourced Top 10 stats, and Discogs physical-collection matching. Architecture is a **monorepo** with a React + shadcn/ui frontend, a Node.js REST (primary) API, optional GraphQL read API, and PostgreSQL for server-side persistence (credentials metadata, Discogs sync, match overrides, scrobble retry queue). Sensitive tokens stay on the backend; the browser uses `localStorage` for UI/settings and **IndexedDB** for large audio caches (complementing, not replacing, `localStorage`).

## Technical Context

**Language/Version**: TypeScript 5.x strict on both tiers; React **19.2.x** (latest stable); Node.js **22.x LTS** (latest stable LTS); PostgreSQL **16+** (latest stable)

**Primary Dependencies**:
- **Frontend**: Vite, React 19, React Router, TanStack Query, Zustand (playback/queue UI state), **Howler.js** (audio playback + crossfade), shadcn/ui + Tailwind CSS, `workbox` (service worker / PWA), Vitest + Testing Library + MSW
- **Backend**: Fastify (or Express), Zod validation, Drizzle ORM + `drizzle-kit`, `pg`, Vitest + supertest; optional `@apollo/server` + `graphql` for read-only GraphQL
- **Shared**: `packages/shared-types` — Zod schemas + inferred TS types for REST bodies and domain enums

**Storage**:
- **PostgreSQL**: Plex/Discogs/Last.fm connection records (encrypted secrets), Discogs collection snapshots, match overrides, server-side scrobble outbox, library index cache metadata
- **Browser `localStorage`**: theme mode, non-sensitive playback prefs, UI state, feature flags (per user request)
- **Browser IndexedDB**: audio pre-cache + permanent cache blobs, durable pending-scrobble queue (spec FR-084), library browse cache
- **Browser Cache API** (via service worker): static assets, stale-while-revalidate API responses where safe

**Testing**: Vitest on `frontend/` and `backend/`; coverage thresholds **80%** lines/branches/functions (enforced in CI); MSW for frontend API mocks; testcontainers or docker-compose PostgreSQL for backend integration tests on critical paths

**Target Platform**: Modern Chromium/Firefox/Safari desktop browsers; installable PWA; responsive down to 320px width (constitution + spec FR-074)

**Project Type**: Web application (frontend + backend + shared types monorepo)

**Performance Goals** (from spec success criteria): SC-002 ≤3s to start playback; SC-011 ≤1s from cache; SC-005 stats view ≤2s for 50k-track libraries; seamless auto-queue prefetch at 1 track remaining

**Constraints**: Single-user operator; Plex/Discogs/Last.fm tokens never in plain client storage; FLAC primary; album-centric navigation; REST is canonical contract; GraphQL optional and read-focused only if enabled

**Scale/Scope**: One operator, one Plex server (multi-library), Discogs collections up to ~2,000 releases, libraries up to ~50,000 tracks; v1 excludes multi-device settings/cache sync

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass — React 19.2.x, TS strict |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — Node 22 LTS |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — documented exceptions in Complexity Tracking |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — REST primary; GraphQL optional per explicit user request |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — `packages/shared-types` + OpenAPI |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass with note — default/Light/Dark/Sync themes meet AA; Custom theme (spec FR-095) is user-controlled palette without contrast enforcement |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass — GraphQL + 80% coverage explicitly requested |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass |

**Post-design re-check**: All gates remain ✅. Optional GraphQL and custom audio/cache UI components are justified below.

## Project Structure

### Documentation (this feature)

```text
specs/001-plex-music-player/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 — OpenAPI + optional GraphQL SDL
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/
└── shared-types/           # Zod schemas, API DTOs, shared enums

backend/
├── src/
│   ├── api/
│   │   ├── routes/         # REST /api/v1/*
│   │   └── graphql/        # Optional read schema (feature-flagged)
│   ├── services/           # Plex, Discogs, Last.fm, matching, scrobble
│   ├── db/                 # Drizzle schema, migrations
│   └── lib/                # crypto, config, errors
└── tests/
    ├── unit/
    └── integration/

frontend/
├── src/
│   ├── components/         # shadcn wrappers + feature composites
│   ├── pages/              # Album grid, artist, now-playing, settings, stats, collection
│   ├── hooks/
│   ├── services/           # REST client (TanStack Query)
│   ├── stores/             # playback queue, player
│   └── lib/                # localStorage, IndexedDB cache, Howler player service
├── public/                 # manifest, icons
└── tests/
    └── unit/

docker-compose.yml          # PostgreSQL for local dev
```

**Structure Decision**: **Option 2 — Web application monorepo** (`frontend/`, `backend/`, `packages/shared-types/`). Plex streaming and secrets are proxied through the backend so tokens are not exposed to the browser. Large binary caches use IndexedDB; `localStorage` holds settings and theme prefs per the user's stack directive.

## Complexity Tracking

| Violation / exception | Why Needed | Simpler Alternative Rejected Because |
|----------------------|------------|--------------------------------------|
| Optional GraphQL read API | User explicitly requested optional GraphQL alongside REST | REST-only is default, but GraphQL helps aggregate library + stats queries in one round-trip for complex screens |
| IndexedDB in addition to `localStorage` | Spec requires multi-GB audio caches; `localStorage` ~5MB limit | `localStorage` alone cannot store FLAC blobs or pinned libraries |
| Howler.js playback library | User-directed choice for playback/crossfade (research §6); not a UI component | Raw HTML5/Web Audio rejected for crossfade complexity |
| Custom `AudioPlayer` transport shell | No shadcn equivalent for player chrome wired to Howler | Composing shadcn `Slider`, `Button`, `Card` around `usePlayer` (Howler-backed) |
| Custom album grid density / now-playing hero layout | shadcn has no album-wall component | Built from shadcn `Card`, `AspectRatio`, `ScrollArea` with layout CSS |
| Custom theme live-preview color pickers | shadcn color input patterns exist but preset manager is app-specific | `Popover` + native/color input from shadcn patterns |
| FR-095 vs Constitution IV (Custom theme no contrast check) | Product spec mandates no WCAG blocking on user Custom colors | Constitution AA applies to default themes and component primitives; Custom mode documents user responsibility |

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete (re-validated 2026-05-18) |
| Data model | [data-model.md](./data-model.md) | Complete (re-validated 2026-05-18; match_candidates) |
| REST contract | [contracts/openapi.yaml](./contracts/openapi.yaml) | Complete (matchCandidates on partial items) |
| GraphQL (optional) | [contracts/graphql.schema.graphql](./contracts/graphql.schema.graphql) | ✅ Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete (all drizzle/*.sql migrations) |

## Implementation Phases (high level — detail in tasks.md)

### Phase 2+ (out of scope for `/speckit-plan`)

1. **Foundation**: monorepo scaffold, Docker PostgreSQL, shared-types, auth/crypto for stored tokens, CI coverage gates (80%)
2. **P1 — Plex playback**: connect, album grid, queue, player, pre-cache, REST proxy streaming
3. **P1 cont.**: Settings (Plex, Playback, Storage), PWA shell, theming (shadcn + CSS variables)
4. **P2 — Stats + Settings expansion**: Top 10 from Plex history, Last.fm scrobble + outbox
5. **P3 — Discogs**: sync, matching engine, collection UI
6. **Polish**: GraphQL flag (if enabled), performance tuning against success criteria

**Next command**: `/speckit-tasks` to generate dependency-ordered `tasks.md`.
