# Implementation Plan: Targeted Library Queries

**Branch**: `008-targeted-plex-queries` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-targeted-plex-queries/spec.md`

## Summary

Replace the **full-catalog `getAllAlbumsWithStats` path** in per-group library handlers with **targeted Plex queries** per curated profile: remote sort/filter where possible, fixed-cap local fallback (N=500) when not, hybrid bounded pool for Random Picks (M₁+M₂), and **fetch-to-20 caching** so home (`limit=10`) and View all (`limit=20`) share one result set per 60s TTL. **No API or frontend contract changes**; Browse All and legacy bundled `/groups` keep full-catalog behavior on demand.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19.2.x; Node.js 22.x LTS; PostgreSQL 16+ (no migrations)

**Primary Dependencies**:
- **Backend**: Fastify, existing `plex-client`, `album-groups-service`, `library-service`, `artist-spotlight-repo`
- **Frontend**: No changes required (006 hooks/routes unchanged)
- **Shared**: `packages/shared-types` — no schema changes

**Storage**: In-memory profile caches only; `artist_spotlight_state` unchanged

**Testing**: Vitest — unit tests for each profile’s Plex params and cache slicing; integration tests for SC-003 payload reduction and SC-004 equivalence on remote path; degraded-mode fixtures for N-cap fallback

**Target Platform**: PWA + Node backend; libraries up to ~50k albums

**Performance Goals**:
- SC-001: first group &lt; 3s on 5k+ albums (Recently Added one-hop)
- SC-003: ≥50% fewer album records parsed on cold 5-parallel home load vs baseline
- Per-profile cache hit: &lt;50ms (slice only)

**Constraints**:
- Constitution V: no new npm dependencies
- FR-008 / SC-004: deterministic groups equivalent on **remote-success** path only
- FR-006: Random Picks hybrid pool (not shuffle-equivalent)
- FR-013: fallback cap N=500, no unbounded scan

**Scale/Scope**: Backend-only optimization of five group endpoints + `plex-client` extensions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass (no FE change) |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — no migration |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ N/A |
| Frontend ↔ Backend via RESTful API only | III. API Contract | ✅ Pass — same routes/responses |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — OpenAPI notes only |
| Frontend meets WCAG 2.1 AA | IV. Frontend Quality | ✅ N/A |
| Frontend is offline-first PWA | IV. Frontend Quality | ✅ Pass — existing SW |
| Responsive layout 320px–desktop | IV. Frontend Quality | ✅ N/A |
| No new libraries without explicit request | V. Simplicity & Restraint | ✅ Pass |
| New dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ N/A |

**Post-design re-check**: All gates remain ✅.

## Project Structure

### Documentation (this feature)

```text
specs/008-targeted-plex-queries/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/openapi.yaml
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/src/services/plex/
├── plex-client.ts                 # + fetchAlbumsSorted, fetchArtistsPage, fetchAlbumMetadataBatch
├── targeted-library-service.ts    # NEW — profiles, cache, fallback scanner
├── album-groups-service.ts        # wire profiles; remove loadAlbumsWithPlayCounts
└── library-service.ts             # getAllAlbumsWithStats retained for browse/legacy

backend/tests/
├── unit/targeted-library-service.test.ts
├── unit/album-groups-service.test.ts   # update mocks
└── integration/library-targeted-groups.test.ts

frontend/                             # no changes unless tests need fixture tweaks
```

**Structure Decision**: Web monorepo; all work in `backend/src/services/plex/` and tests.

## Complexity Tracking

No constitution violations.

## Phase 0: Research

See [research.md](./research.md). Resolved: Plex sort keys, per-profile pipelines, N/M₁/M₂ constants, cache keys, Random hybrid pool, remote-first + degraded fallback.

## Phase 1: Design

### Data model

See [data-model.md](./data-model.md) — `LibraryQueryProfile`, `ProfileResultCache`, `RandomPicksPool`.

### Contracts

See [contracts/openapi.yaml](./contracts/openapi.yaml) — behavioral notes; no breaking API changes.

### Implementation sequence (for `/speckit-tasks`)

1. **`plex-client`**: `fetchAlbumsSorted`, optional `fetchArtistsPage` (type=8), `fetchAlbumMetadataBatch`.
2. **`targeted-library-service`**: Implement five profiles + `getProfileResult(profile, libraryId, limit)` with cache/in-flight dedupe; internal size 20.
3. **`album-groups-service`**: Replace `loadAlbumsWithPlayCounts` calls with profile service; keep pure `select*` functions for tests.
4. **Tests**: Unit per profile; integration cold-load record count; golden equivalence for deterministic groups.
5. **Legacy**: Leave `getAlbumGroups` on full catalog or migrate to parallel profiles (lower priority).

### Agent context

`.cursor/rules/specify-rules.mdc` updated to reference this plan.

## Phase 2

**Not in scope for `/speckit-plan`.** Run `/speckit-tasks` to generate `tasks.md`.
