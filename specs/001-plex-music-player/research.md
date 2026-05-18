# Research: Plex Music Player (001-plex-music-player)

**Date**: 2026-05-18 (re-validated)  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All items from Technical Context were resolved; no `NEEDS CLARIFICATION` remains.

---

## 1. Monorepo layout and package manager

**Decision**: npm workspaces monorepo with `frontend/`, `backend/`, `packages/shared-types/`.

**Rationale**: Single repo matches spec-kit web-app template; shared-types avoids REST DTO drift; npm workspaces is zero-config with Node 22 LTS.

**Alternatives considered**:
- Turborepo/pnpm — faster CI but extra tooling not requested
- Single package — cannot enforce FE/BE coverage separately

---

## 2. Backend framework and ORM

**Decision**: **Fastify** + **Drizzle ORM** + `postgres.js` driver.

**Rationale**: Fastify has strong TypeScript ergonomics and performance for proxy/stream routes; Drizzle is lightweight, SQL-transparent, and migration-friendly for PostgreSQL.

**Alternatives considered**:
- Express — ubiquitous but slower middleware chain for streaming
- Prisma — heavier codegen; less control over complex matching queries

---

## 3. API surface: REST primary, GraphQL optional

**Decision**: Versioned REST at `/api/v1/*` is the **canonical** contract. Optional GraphQL at `/graphql` exposes **read-only** queries (`library`, `album`, `topStats`, `discogsCollection`) behind env flag `GRAPHQL_ENABLED=true`.

**Rationale**: Constitution III mandates REST; user explicitly requested optional GraphQL for aggregated reads. Mutations (settings save, pin, scrobble flush) stay REST-only to avoid dual write paths.

**Alternatives considered**:
- GraphQL-only — violates constitution without amendment
- tRPC — not requested; adds coupling

---

## 4. Client storage split (`localStorage` + IndexedDB)

**Decision**:
- **`localStorage`**: theme mode, active custom preset id, playback prefs (crossfade, auto-queue, pre-cache N), non-secret UI flags
- **IndexedDB** (`dexaudio-cache` DB): audio blobs, cache metadata (version signal, `cache_kind`), pending scrobble queue (spec durability)
- **PostgreSQL (backend)**: encrypted Plex/Discogs/Last.fm credentials, Discogs snapshot, match overrides, server-side scrobble backup

**Rationale**: User requested `localStorage`; spec requires multi-GB caches and durable scrobble queue — impossible in `localStorage` alone. Split is standard PWA practice.

**Alternatives considered**:
- Everything in PostgreSQL — breaks offline pinned playback and violates edge-case “Plex unreachable + pinned plays”
- OPFS only — narrower browser support than IndexedDB for v1

---

## 5. Plex integration pattern

**Decision**: Backend **Plex proxy** — browser never holds Plex token. Backend uses `@plexinc/plex-media-server` or direct Plex HTTP API with server-stored token. Stream endpoint: `GET /api/v1/stream/:trackId` returns redirect or chunked proxy; frontend **Howler.js** plays from same-origin stream URLs or IndexedDB blob URLs.

**Rationale**: FR-054 requires credentials not plain on disk in client; CORS to Plex is unreliable. Backend can log play progress to Plex where required.

**Alternatives considered**:
- Direct browser → Plex — exposes token, CORS pain
- Full library mirror in PostgreSQL — overkill for v1

---

## 6. Audio playback and crossfade

**Decision**: **[Howler.js](https://howlerjs.com/)** (`howler` npm package) as the sole playback engine. A `usePlayer` hook wraps a `Howl` (or paired `Howl` instances for overlap) per track, sourcing `src` from the backend proxy URL or an IndexedDB object URL when cached. Crossfade (FR-016) uses Howler’s volume fades: fade out the outgoing `Howl`, fade in the incoming `Howl` over the user-configured duration, capped per spec edge cases.

**Rationale**: Howler abstracts Web Audio / HTML5 Audio with a stable API for play/pause/seek/volume, supports multiple concurrent sounds for crossfade, and handles format quirks across browsers — reducing custom Web Audio glue. Transport UI remains shadcn (`Slider`, `Button`, etc.) bound to Howler state.

**Alternatives considered**:
- Raw HTML5 `Audio` — insufficient for reliable crossfade and concurrent decode without bespoke Web Audio code
- Web Audio API directly — more control but higher implementation cost for v1; Howler already uses Web Audio where available

---

## 7. Auto-queue similar songs

**Decision**: Backend calls Plex **radio / sonically similar** endpoint seeded by `ratingKey` of last played track; filters to active music libraries; returns track IDs for frontend queue append.

**Rationale**: Spec mandates Plex radio source, library-only tracks, prefetch when 1 track remains.

**Alternatives considered**:
- Local ML similarity — out of scope, violates spec

---

## 8. Discogs matching

**Decision**: Normalize artist/title/year (Unicode NFKD, punctuation strip, feat. removal); score with Levenshtein + album-year tolerance; statuses `matched` | `partial` | `not_on_plex`; manual override table in PostgreSQL.

**Rationale**: Meets FR-034–FR-037 and SC-007 (90% auto-match target on representative collections).

**Alternatives considered**:
- MusicBrainz ID bridge — extra dependency not requested

---

## 9. Last.fm scrobbling

**Decision**: Frontend tracks play position; on threshold (FR-081) POST scrobble to backend `POST /api/v1/lastfm/scrobbles`; backend submits to Last.fm API; failures persist to IndexedDB queue + PostgreSQL outbox; retry with exponential backoff, 24h TTL.

**Rationale**: Offline pinned plays must queue (FR-085); dual persistence survives SW restarts.

**Alternatives considered**:
- Client-direct Last.fm — exposes session key in browser

---

## 10. UI: shadcn/ui component mapping

**Decision**: Use shadcn for all standard UI — `Button`, `Card`, `Dialog`, `Sheet`, `Tabs`, `Table`, `Slider`, `Switch`, `Select`, `Input`, `ScrollArea`, `Badge`, `Sonner` (toasts), `DropdownMenu`, `Command` (search). Custom composites only for album grid, queue drag-reorder, now-playing hero, audio transport.

**Rationale**: Constitution II; spec album-centric layout achieved with Card grid + AspectRatio.

**Alternatives considered**:
- MUI/Chakra — violates constitution V

---

## 11. Testing strategy (80% coverage)

**Decision**:
- **Frontend**: Vitest + `@testing-library/react` + MSW; cover hooks (queue, scrobble threshold, cache LRU), reducers, API client, critical pages (smoke + interaction)
- **Backend**: Vitest unit tests for services (matching, Plex parser, scrobble rules); integration tests with Testcontainers PostgreSQL for repositories
- **CI**: `vitest run --coverage` both packages; fail if lines/functions/branches < **80%**

**Rationale**: User-requested 80% gate; Vitest aligns with Vite frontend and Fastify backend TS.

**Alternatives considered**:
- E2E-only — insufficient for 80% line coverage without slow suite
- 100% coverage — diminishing returns not requested

---

## 12. PWA and service worker

**Decision**: Vite PWA plugin (`vite-plugin-pwa`) with Workbox — precache app shell; network-first for `/api/v1/*`; cache-first for static assets.

**Rationale**: Constitution IV offline-first; supports installability SC and spec FR-073.

**Alternatives considered**:
- Manual SW — more boilerplate, error-prone

---

## 13. Security for credentials (FR-054)

**Decision**: AES-256-GCM encrypt secrets at rest in PostgreSQL with `APP_SECRET` from env; mask in API responses; never log tokens.

**Rationale**: “Protection mechanism appropriate to deployment platform” for self-hosted single-user app.

**Alternatives considered**:
- Hashing only — insufficient for reversible API tokens

---

## 14. Database migrations (CI and local)

**Decision**: Numbered SQL files in `backend/drizzle/` (`0000_init.sql`, `0001_match_candidates.sql`, …) applied **in lexicographic order**; `0000_init.sql` includes columns/indexes also added in later migrations so fresh installs are complete; CI applies all `*.sql` files (not only `0000_init`).

**Rationale**: Partial-match feature added `match_candidates` on `collection_matches`; integration tests query that column — partial migration caused HTTP 500 in CI.

**Alternatives considered**:
- Single monolithic migration only — harder to evolve schema incrementally
- `drizzle-kit migrate` only in CI — requires extra Node step; raw SQL loop matches docker-compose quickstart
