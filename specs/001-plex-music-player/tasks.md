---
description: "Task list for Plex Music Player with Discogs Collection Sync"
---

# Tasks: Plex Music Player with Discogs Collection Sync

**Input**: Design documents from `/specs/001-plex-music-player/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: Included — plan and research mandate **80%** line/branch/function coverage (Vitest + MSW frontend, Vitest + supertest/Testcontainers backend).

**Organization**: Tasks grouped by user story (US1–US4) per [spec.md](./spec.md) priorities for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: User story label (`[US1]`…`[US4]`) on story-phase tasks only

## Path Conventions

Monorepo per [plan.md](./plan.md): `packages/shared-types/`, `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo scaffold, tooling, and workspace layout

- [ ] T001 Create npm workspaces monorepo root `package.json` with workspaces `frontend`, `backend`, `packages/shared-types`
- [ ] T002 Add `docker-compose.yml` PostgreSQL 16 service and `.env.example` with `DATABASE_URL` and `APP_SECRET`
- [ ] T003 Scaffold `packages/shared-types/package.json` and `packages/shared-types/src/index.ts` export barrel
- [ ] T004 [P] Scaffold `frontend/` with Vite, React 19, TypeScript strict, Tailwind, and `frontend/tsconfig.json`
- [ ] T005 [P] Scaffold `backend/` with Fastify, TypeScript strict, and `backend/tsconfig.json`
- [ ] T006 [P] Initialize shadcn/ui in `frontend/src/components/ui/` per plan component standards
- [ ] T007 [P] Add root ESLint + Prettier configs and per-package lint scripts in root `package.json`
- [ ] T008 [P] Add `frontend/public/manifest.json` and PWA icons under `frontend/public/icons/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before any user story

**⚠️ CRITICAL**: No user story work until this phase is complete

- [ ] T009 Define Drizzle schema for `plex_connections`, `discogs_accounts`, `discogs_releases`, `collection_matches`, `lastfm_accounts`, `scrobble_outbox`, `app_settings` in `backend/src/db/schema.ts` per [data-model.md](./data-model.md)
- [ ] T010 Add initial migration and `npm run db:migrate` script in `backend/package.json` using `drizzle-kit`
- [ ] T011 Implement AES-256-GCM credential encryption in `backend/src/lib/crypto.ts` using `APP_SECRET`
- [ ] T012 [P] Implement Fastify app bootstrap, global error handler, and Zod validation plugin in `backend/src/app.ts`
- [ ] T013 [P] Register versioned REST prefix `/api/v1` route tree in `backend/src/api/routes/index.ts`
- [ ] T014 [P] Generate Zod DTOs from [contracts/openapi.yaml](./contracts/openapi.yaml) into `packages/shared-types/src/api/` (Plex, Library, Track, Album, ErrorBody)
- [ ] T015 [P] Implement `GET /api/v1/health` in `backend/src/api/routes/health.ts`
- [ ] T016 [P] Create TanStack Query REST client and API error types in `frontend/src/services/api-client.ts`
- [ ] T017 [P] Implement `localStorage` settings helpers in `frontend/src/lib/local-storage.ts` for keys in [data-model.md](./data-model.md)
- [ ] T018 [P] Implement IndexedDB `dexaudio-cache` stores `cache_entries` and `pending_scrobbles` in `frontend/src/lib/indexed-db.ts`
- [ ] T019 [P] Add React Router shell, layout, and navigation skeleton in `frontend/src/App.tsx` and `frontend/src/components/layout/AppShell.tsx`
- [ ] T020 [P] Configure theme CSS variables (Light/Dark/Sync) in `frontend/src/styles/themes.css` and wire to `document.documentElement`
- [ ] T021 [P] Configure `vite-plugin-pwa` and service worker in `frontend/vite.config.ts` per [research.md](./research.md) §12
- [ ] T022 [P] Configure Vitest + 80% coverage thresholds in `frontend/vitest.config.ts` and `backend/vitest.config.ts`
- [ ] T023 [P] Add CI workflow `.github/workflows/test.yml` running `npm run test:coverage` for both workspaces with 80% gate

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Stream music from my Plex server (Priority: P1) 🎯 MVP

**Goal**: Connect to Plex, album-centric browse, playback queue, Howler transport, dual-tier cache, auto-queue, optional crossfade, and last.fm scrobble threshold behavior

**Independent Test**: Enter Plex URL/token, browse album grid, build queue, play FLAC/MP3 with transport controls; queue reorder/remove; auto-queue when 1 track remains (if enabled); play from cache when present; scrobble eligible tracks when Last.fm connected

### Tests for User Story 1

- [ ] T024 [P] [US1] Unit tests for Plex response parsers in `backend/tests/unit/plex-parser.test.ts`
- [ ] T025 [P] [US1] Integration tests for `PUT/GET /api/v1/plex/connection` and `GET /api/v1/plex/libraries` in `backend/tests/integration/plex-connection.test.ts`
- [ ] T026 [P] [US1] MSW handlers and unit tests for queue reducer rules in `frontend/tests/unit/playback-queue.test.ts`
- [ ] T027 [P] [US1] Unit tests for scrobble threshold logic in `frontend/tests/unit/scrobble-threshold.test.ts`
- [ ] T028 [P] [US1] Unit tests for pre-cache LRU eviction in `frontend/tests/unit/cache-lru.test.ts`

### Implementation for User Story 1

- [ ] T029 [US1] Implement Plex HTTP client and connection validation in `backend/src/services/plex/plex-client.ts`
- [ ] T030 [US1] Implement `GET/PUT /api/v1/plex/connection` and `GET /api/v1/plex/libraries` in `backend/src/api/routes/plex.ts` per [contracts/openapi.yaml](./contracts/openapi.yaml)
- [ ] T031 [US1] Implement library browse services (albums, artist albums, album tracks, search) in `backend/src/services/plex/library-service.ts`
- [ ] T032 [US1] Implement `GET /api/v1/library/albums`, `/library/artists/{artistId}/albums`, `/library/albums/{albumId}/tracks`, `/library/search` in `backend/src/api/routes/library.ts`
- [ ] T033 [US1] Implement `GET /api/v1/stream/{trackId}` FLAC/MP3 proxy with 415 for unsupported formats in `backend/src/api/routes/stream.ts`
- [ ] T034 [US1] Implement `GET /api/v1/playback/similar` Plex radio filter in `backend/src/services/plex/similar-tracks-service.ts` and `backend/src/api/routes/playback.ts`
- [ ] T035 [P] [US1] Implement Zustand playback queue store with `source: user|auto` in `frontend/src/stores/playback-queue-store.ts`
- [ ] T036 [P] [US1] Implement Howler-based `usePlayer` hook in `frontend/src/hooks/use-player.ts` (play/pause/seek/volume/crossfade fades)
- [ ] T037 [P] [US1] Implement cache read/write/stale invalidation service in `frontend/src/lib/cache-service.ts` using `frontend/src/lib/indexed-db.ts`
- [ ] T038 [US1] Implement pre-cache look-ahead downloader wired to queue position in `frontend/src/lib/pre-cache-worker.ts`
- [ ] T039 [US1] Implement pin resolver (track/album/artist) and permanent-cache cap prompt flow in `frontend/src/lib/pin-service.ts`
- [ ] T040 [US1] Implement auto-queue prefetch when 1 track remains in `frontend/src/lib/auto-queue.ts` calling `/api/v1/playback/similar`
- [ ] T041 [US1] Build album grid landing page in `frontend/src/pages/AlbumGridPage.tsx` with shadcn `Card` + `AspectRatio`
- [ ] T042 [US1] Build artist albums page (no flat track list) in `frontend/src/pages/ArtistAlbumsPage.tsx`
- [ ] T043 [US1] Build album detail with **Play now** / **Add to queue** actions in `frontend/src/pages/AlbumDetailPage.tsx`
- [ ] T044 [US1] Build now-playing hero view in `frontend/src/pages/NowPlayingPage.tsx` with cache/stream badge
- [ ] T045 [US1] Build queue panel with drag-reorder, remove, and auto-queue visual indicator in `frontend/src/components/queue/QueuePanel.tsx`
- [ ] T046 [US1] Build audio transport shell (shadcn `Slider` + `Button`) in `frontend/src/components/player/AudioPlayer.tsx`
- [ ] T047 [US1] Build library search results page in `frontend/src/pages/SearchPage.tsx`
- [ ] T048 [US1] Build first-run Plex connection form in `frontend/src/pages/onboarding/PlexSetupPage.tsx` calling `PUT /api/v1/plex/connection`
- [ ] T049 [US1] Implement Last.fm scrobble submission service in `backend/src/services/lastfm/lastfm-client.ts`
- [ ] T050 [US1] Implement `POST /api/v1/lastfm/scrobbles` and outbox persistence in `backend/src/api/routes/lastfm.ts` and `backend/src/services/lastfm/scrobble-outbox.ts`
- [ ] T051 [US1] Implement client scrobble tracker, IndexedDB pending queue, and POST on threshold in `frontend/src/lib/scrobble-tracker.ts`
- [ ] T052 [US1] Wire unsupported-format badges and playback guard for non-FLAC/MP3 in `frontend/src/components/library/TrackRow.tsx`

**Checkpoint**: User Story 1 independently testable as MVP (Plex playback + queue + cache + scrobble pipeline)

---

## Phase 4: User Story 2 — View listening statistics (Priority: P2)

**Goal**: Top 10 songs, albums, and artists from Plex play history with refresh

**Independent Test**: With Plex play history present, open Stats view and see up to three ranked lists with play counts; fewer than 10 items renders without errors; refresh updates counts

### Tests for User Story 2

- [ ] T053 [P] [US2] Unit tests for Top 10 aggregation in `backend/tests/unit/top-stats-service.test.ts`
- [ ] T054 [P] [US2] Component tests for stats lists in `frontend/tests/unit/stats-page.test.tsx`

### Implementation for User Story 2

- [ ] T055 [US2] Implement Plex play-history aggregation for Top 10 in `backend/src/services/plex/top-stats-service.ts`
- [ ] T056 [US2] Implement `GET /api/v1/stats/top` in `backend/src/api/routes/stats.ts` per [contracts/openapi.yaml](./contracts/openapi.yaml)
- [ ] T057 [US2] Build Stats page with three lists and refresh control in `frontend/src/pages/StatsPage.tsx`
- [ ] T058 [US2] Add empty-state handling when no play history in `frontend/src/components/stats/TopTenList.tsx`
- [ ] T059 [US2] Add navigation link to Stats in `frontend/src/components/layout/AppShell.tsx`

**Checkpoint**: User Stories 1 and 2 work independently

---

## Phase 5: User Story 3 — Import and match Discogs physical collection (Priority: P3)

**Goal**: Sync Discogs collection, match against Plex library, collection UI with filters and manual overrides

**Independent Test**: Save Discogs credentials, trigger sync, open Collection view with match statuses, filter "Not on Plex", navigate matched items to Plex album play flow

### Tests for User Story 3

- [ ] T060 [P] [US3] Unit tests for normalization and matching scores in `backend/tests/unit/discogs-matcher.test.ts`
- [ ] T061 [P] [US3] Integration tests for `POST /api/v1/discogs/sync` and `GET /api/v1/discogs/collection` in `backend/tests/integration/discogs.test.ts`

### Implementation for User Story 3

- [ ] T062 [US3] Implement Discogs API client in `backend/src/services/discogs/discogs-client.ts`
- [ ] T063 [US3] Implement collection sync job with rate-limit pause/resume in `backend/src/services/discogs/sync-service.ts`
- [ ] T064 [US3] Implement matching engine (strict/fuzzy) writing `collection_matches` in `backend/src/services/discogs/matcher.ts`
- [ ] T065 [US3] Implement `PUT /api/v1/discogs/connection`, `POST /api/v1/discogs/sync`, `GET /api/v1/discogs/collection`, `PATCH /api/v1/discogs/matches/{releaseId}` in `backend/src/api/routes/discogs.ts`
- [ ] T066 [US3] Build Collection page with match status badges in `frontend/src/pages/CollectionPage.tsx`
- [ ] T067 [US3] Build match-status filter and "Not on Plex" filter in `frontend/src/components/collection/CollectionFilters.tsx`
- [ ] T068 [US3] Build manual match override dialog in `frontend/src/components/collection/MatchOverrideDialog.tsx`
- [ ] T069 [US3] Wire matched release → Plex album navigation in `frontend/src/components/collection/CollectionRow.tsx`

**Checkpoint**: User Stories 1–3 independently functional

---

## Phase 6: User Story 4 — Configure everything from settings/admin (Priority: P2)

**Goal**: Unified Settings area for Plex, Discogs, Last.fm, Playback, Library, Matching, Storage, and Appearance with persistence, validation, masking, and reset

**Independent Test**: Open Settings from any screen; change each section; values persist across restart; credentials masked; failed validation shows actionable errors; Storage shows usage and clear actions; theme modes and Custom presets work with live preview

### Tests for User Story 4

- [ ] T070 [P] [US4] Integration tests for `GET/PATCH /api/v1/settings` and `POST /api/v1/settings/reset` in `backend/tests/integration/settings.test.ts`
- [ ] T071 [P] [US4] Unit tests for Custom theme preset min-1 rule in `frontend/tests/unit/custom-theme-presets.test.ts`
- [ ] T072 [P] [US4] Integration tests for `PUT/DELETE /api/v1/lastfm/connection` and `POST /api/v1/lastfm/scrobbles/retry` in `backend/tests/integration/lastfm-settings.test.ts`

### Implementation for User Story 4

- [ ] T073 [US4] Implement `app_settings` repository and `GET/PATCH /api/v1/settings` in `backend/src/api/routes/settings.ts`
- [ ] T074 [US4] Implement `POST /api/v1/settings/reset` with selective targets in `backend/src/services/settings/reset-service.ts`
- [ ] T075 [US4] Build Settings layout with section tabs in `frontend/src/pages/SettingsPage.tsx`
- [ ] T076 [US4] Build Plex Server section (masked token, library multi-select) in `frontend/src/components/settings/PlexSettingsSection.tsx`
- [ ] T077 [US4] Build Discogs section in `frontend/src/components/settings/DiscogsSettingsSection.tsx`
- [ ] T078 [US4] Implement `PUT/DELETE /api/v1/lastfm/connection` in `backend/src/api/routes/lastfm.ts`
- [ ] T079 [US4] Build Last.fm section (connect/disconnect, pending count, Retry/Clear) in `frontend/src/components/settings/LastfmSettingsSection.tsx`
- [ ] T080 [US4] Build Playback section (auto-queue, crossfade, pre-cache N) in `frontend/src/components/settings/PlaybackSettingsSection.tsx` persisting to `localStorage`
- [ ] T081 [US4] Build Library section (refresh policy) in `frontend/src/components/settings/LibrarySettingsSection.tsx`
- [ ] T082 [US4] Build Matching section (strict/fuzzy) in `frontend/src/components/settings/MatchingSettingsSection.tsx`
- [ ] T083 [US4] Build Storage section (usage, caps, pinned list, Clear pre-cache/Unpin all/Clear everything) in `frontend/src/components/settings/StorageSettingsSection.tsx`
- [ ] T084 [US4] Build Appearance section (Sync/Light/Dark/Custom mode picker) in `frontend/src/components/settings/AppearanceSettingsSection.tsx`
- [ ] T085 [US4] Build Custom theme preset editor with live preview, Save/Reset, duplicate/delete (min 1 preset) in `frontend/src/components/settings/CustomThemeEditor.tsx`
- [ ] T086 [US4] Implement `prefers-color-scheme` listener for Sync mode in `frontend/src/hooks/use-theme-sync.ts`
- [ ] T087 [US4] Implement credential reveal-on-demand pattern in `frontend/src/components/settings/MaskedSecretInput.tsx`
- [ ] T088 [US4] Add reconnect/disrupt-playback confirmation when changing Plex server during playback in `frontend/src/components/settings/PlexSettingsSection.tsx`

**Checkpoint**: Full settings/admin area complete; all four user stories independently testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Optional GraphQL, performance, accessibility, and quickstart validation

- [ ] T089 [P] Implement optional read-only GraphQL schema in `backend/src/api/graphql/schema.ts` from [contracts/graphql.schema.graphql](./contracts/graphql.schema.graphql) behind `GRAPHQL_ENABLED`
- [ ] T090 [P] Add GraphQL resolvers for `library`, `topStats`, `discogsCollection` in `backend/src/api/graphql/resolvers.ts`
- [ ] T091 Performance-tune album grid pagination and stats caching to meet SC-005/SC-011 in `backend/src/services/plex/library-service.ts` and `backend/src/services/plex/top-stats-service.ts`
- [ ] T092 Run WCAG 2.1 AA pass on default Light/Dark/Sync themes in `frontend/src/styles/themes.css` and shadcn primitives
- [ ] T093 Validate [quickstart.md](./quickstart.md) end-to-end (docker, migrate, dev servers, coverage commands) and fix gaps in root `README.md`
- [ ] T094 [P] Fill coverage gaps to maintain ≥80% in `frontend/tests/` and `backend/tests/` per CI gate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **User Story 1 (Phase 3)**: Depends on Phase 2 — **MVP**
- **User Story 2 (Phase 4)**: Depends on Phase 2; benefits from US1 Plex connection but testable with mocked/history data
- **User Story 3 (Phase 5)**: Depends on Phase 2 + Plex library from US1 for matching; Discogs credentials UI can ship with US3 if US4 not done (minimal inline form acceptable for story test)
- **User Story 4 (Phase 6)**: Depends on Phase 2; integrates with US1–US3 services (Last.fm, Discogs, Storage, Appearance)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | Plex connect → browse → play → queue → cache |
| US2 | P2 | Foundational (+ Plex for real data) | Stats view with Top 10 lists |
| US3 | P3 | Foundational + Plex library | Discogs sync + collection + match UI |
| US4 | P2 | Foundational | Settings sections persist and validate |

**Recommended delivery order**: US1 (MVP) → US4 (full settings) → US2 → US3 — OR spec order US1 → US2 → US3 → US4 if settings are built incrementally inside each story.

### Within Each User Story

- Tests SHOULD be written and fail before implementation (TDD-friendly)
- Backend services before routes
- Shared-types/DTOs before route handlers
- Frontend stores/hooks before pages
- Story checkpoint before next priority

### Parallel Opportunities

- Phase 1: T004–T008 can run in parallel after T001–T003
- Phase 2: T012–T023 marked [P] after T009–T011
- US1: T024–T028 tests in parallel; T035–T037 in parallel; T041–T047 pages in parallel after stores
- US2: T053–T054 parallel; T057–T059 sequential on stats service
- US3: T060–T061 parallel; T066–T069 parallel after routes
- US4: T070–T072 parallel; T076–T085 section components largely parallel after T075

---

## Parallel Example: User Story 1

```bash
# Tests (parallel):
backend/tests/unit/plex-parser.test.ts
frontend/tests/unit/playback-queue.test.ts
frontend/tests/unit/scrobble-threshold.test.ts
frontend/tests/unit/cache-lru.test.ts

# Frontend core (parallel after API routes exist):
frontend/src/stores/playback-queue-store.ts
frontend/src/hooks/use-player.ts
frontend/src/lib/cache-service.ts

# Pages (parallel after stores):
frontend/src/pages/AlbumGridPage.tsx
frontend/src/pages/ArtistAlbumsPage.tsx
frontend/src/pages/NowPlayingPage.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE** per spec US1 independent test
5. Demo/deploy PWA shell

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → MVP playback product
3. US4 → full operator settings (or ship minimal Plex/Playback settings inside US1 first)
4. US2 → listening stats dashboard
5. US3 → Discogs collector workflow
6. Polish → GraphQL flag, performance, a11y, quickstart

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3): ~52 tasks (T001–T052)

---

## Notes

- Plex token and third-party secrets stay server-side (`plex_connections`, encrypted); browser uses `localStorage` for non-secret prefs only
- GraphQL is optional (T089–T090); REST remains canonical per constitution
- Custom theme (FR-095) has no contrast enforcement; default themes must meet WCAG AA (T092)
- Task IDs T001–T094 are sequential in execution order
