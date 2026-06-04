# Tasks: Now Playing Waveform

**Input**: Design documents from `/specs/026-now-playing-waveform/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests included where plan.md lists new test files (Plex parser, waveform route, hook, `TrackWaveform`).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment before shared API types and Plex integration.

- [x] T001 Verify branch `026-now-playing-waveform` is checked out and `specs/026-now-playing-waveform/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [x] T002 [P] Add `TrackWaveformSchema` and `TrackWaveformQuerySchema` in `packages/shared-types/src/api/schemas.ts` per `contracts/waveform-endpoint.md`; export types from package entry if required by existing pattern

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Plex loudness fetch + versioned REST endpoint — required before any waveform UI.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Implement `parseAudioStreamIdFromTrackXml` and extend `TrackStreamContext` with `audioStreamId` in `backend/src/services/plex/plex-client.ts`
- [x] T004 [P] Unit tests for audio stream id parsing in `backend/tests/unit/plex-waveform-parser.test.ts`
- [x] T005 Implement `fetchStreamLevels`, dB→normalized `samples`, and `subsample` handling in `backend/src/services/plex/plex-client.ts` (or shared helper used by service)
- [x] T006 Create `backend/src/services/plex/track-waveform-service.ts` orchestrating context + levels → `TrackWaveform` per `data-model.md`
- [x] T007 Register `GET /library/tracks/:trackId/waveform` in `backend/src/api/routes/library.ts` per `contracts/waveform-endpoint.md` (404 `waveform_unavailable`, no empty samples)
- [x] T008 [P] Unit or integration tests for waveform route and normalization in `backend/tests/unit/track-waveform-route.test.ts`

**Checkpoint**: Foundation ready — `curl /api/v1/library/tracks/{id}/waveform` returns samples or 404.

---

## Phase 3: User Story 1 — See playback progress on a waveform (Priority: P1) 🎯 MVP

**Goal**: On Now Playing, when Plex provides levels, show a two-tone waveform above the seek slider that tracks playback position; hide entirely when unavailable or loading (no skeleton).

**Independent Test**: Play a track with Plex loudness data → open Now Playing → waveform above slider with accent played / muted unplayed; boundary moves during playback; track without data shows slider only.

### Implementation for User Story 1

- [x] T009 [US1] Implement `useTrackWaveform` fetch + status machine (`idle`/`loading`/`ready`/`unavailable`) in `frontend/src/hooks/use-track-waveform.ts` calling `/api/v1/library/tracks/:trackId/waveform`
- [x] T010 [P] [US1] Unit tests for hook states and no-ui-while-loading in `frontend/tests/unit/use-track-waveform.test.ts`
- [x] T011 [US1] Create `TrackWaveform` display in `frontend/src/components/player/TrackWaveform.tsx` — canvas/SVG bars ~64px, theme played/unplayed colors, `aria-hidden`, sync split to `positionMs`/`durationMs` (display-only, no seek yet)
- [x] T012 [US1] Add optional `trackId` prop and render `TrackWaveform` above seek `Slider` in `frontend/src/components/player/AudioPlayer.tsx`
- [x] T013 [US1] Pass `trackId={current.id}` and position/duration/seek props from `frontend/src/pages/NowPlayingPage.tsx` into `AudioPlayer`

**Checkpoint**: User Story 1 — visible synced waveform or clean absence when unavailable.

---

## Phase 4: User Story 2 — Scrub and seek using the waveform (Priority: P2)

**Goal**: Click-to-seek on waveform with hover time preview; no drag-scrub on waveform; respect `seekDisabled` (remote cast).

**Independent Test**: Hover shows target time without seek; click jumps playback; drag on waveform does nothing; progress bar drag still updates waveform; remote seek-disabled blocks click and hover.

### Implementation for User Story 2

- [x] T014 [US2] Add click `x` → `onSeek(ms)` mapping with clamp in `frontend/src/components/player/TrackWaveform.tsx` per `contracts/ui-track-waveform.md`
- [x] T015 [US2] Add hover time tooltip (shadcn `Tooltip` or equivalent) without seeking; disable preview when `seekDisabled` in `frontend/src/components/player/TrackWaveform.tsx`
- [x] T016 [US2] Ensure pointer drag across waveform does not scrub (click-only); pass `seekDisabled` from `AudioPlayer` through to `TrackWaveform`
- [x] T017 [P] [US2] Unit tests for click seek, drag no-op, and `seekDisabled` in `frontend/tests/unit/TrackWaveform.test.tsx`

**Checkpoint**: User Stories 1 and 2 — visual progress plus click-to-seek and hover preview.

---

## Phase 5: User Story 3 — Waveform across track and queue changes (Priority: P3)

**Goal**: Waveform updates on skip without stale shapes; in-memory cache for revisits; paused position frozen.

**Independent Test**: A→B (no waveform)→C (with waveform): no stale A on B/C; replaying A uses cache without long blank gap.

### Implementation for User Story 3

- [x] T018 [US3] Abort in-flight fetch and clear visible bars immediately on `trackId` change in `frontend/src/hooks/use-track-waveform.ts`
- [x] T019 [US3] Add per-session `Map<trackId, TrackWaveform>` cache and `unavailable`/`error` silent hide in `frontend/src/hooks/use-track-waveform.ts`
- [x] T020 [P] [US3] Unit tests for cache hit, abort on id change, and unavailable hide in `frontend/tests/unit/use-track-waveform.test.ts`

**Checkpoint**: All three user stories independently verifiable per `quickstart.md`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Motion preferences, manual validation, regression tests.

- [x] T021 Honor `prefers-reduced-motion: reduce` for waveform position updates (no decorative transition) in `frontend/src/components/player/TrackWaveform.tsx`
- [x] T022 Run manual scenarios in `specs/026-now-playing-waveform/quickstart.md` and fix gaps
- [x] T023 [P] Run `npm test` in `backend/` and `frontend/` for waveform parser, route, hook, and component regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational (API must exist)
- **User Story 2 (Phase 4)**: Depends on US1 (`TrackWaveform` + `AudioPlayer` wiring)
- **User Story 3 (Phase 5)**: Depends on US1 hook/component (extends lifecycle)
- **Polish (Phase 6)**: Depends on US1–US3 (or MVP + chosen stories)

### User Story Dependencies

| Story | Depends on | Can test alone after |
|-------|------------|----------------------|
| US1 (P1) | Phase 2 | Phase 3 checkpoint |
| US2 (P2) | US1 component | Phase 4 checkpoint |
| US3 (P3) | US1 hook | Phase 5 checkpoint |

### Within Each User Story

- Backend foundational before frontend fetch
- Hook before page integration
- Display before seek interactions (US2)
- Lifecycle/cache after base render (US3)

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001 after T001 confirms branch
- **Phase 2**: T004 ∥ T003; T008 ∥ T007 after T006
- **Phase 3**: T010 ∥ T011 after T009
- **Phase 4**: T017 ∥ polish prep after T014–T016
- **Phase 5**: T020 ∥ T018 after T009 baseline
- **Phase 6**: T023 ∥ T021

---

## Parallel Example: User Story 1

```bash
# After T009 hook exists:
Task T010: "Unit tests in frontend/tests/unit/use-track-waveform.test.ts"
Task T011: "TrackWaveform display in frontend/src/components/player/TrackWaveform.tsx"
# Then serialize T012–T013 (AudioPlayer + NowPlayingPage)
```

---

## Parallel Example: Foundational

```bash
# After T003 parser:
Task T004: "plex-waveform-parser.test.ts"
# After T006 service:
Task T007: "library.ts route" 
Task T008: "track-waveform-route.test.ts"  # parallel if route stubbed
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational (**critical**)  
3. Complete Phase 3: User Story 1  
4. **STOP and VALIDATE**: `quickstart.md` §1–2 and §4 (appear / sync / missing data)  
5. Demo MVP without click-seek if needed

### Incremental Delivery

1. Foundation → API smoke  
2. US1 → visual waveform MVP  
3. US2 → click + hover seek UX  
4. US3 → queue skip + cache hardening  
5. Polish → motion + full quickstart

### Parallel Team Strategy

1. Developer A: Phase 2 backend (T003–T008)  
2. Developer B: After T007 — US1 frontend (T009–T013)  
3. Developer C: After US1 — US2 seek (T014–T017) while A finishes tests  

---

## Notes

- Progress bar remains primary accessible control; waveform stays `aria-hidden` (FR-010)
- No new npm packages (Constitution V)
- Header `NowPlayingControlPanel` out of scope (FR-008)
- Plex tracks without loudness analysis return 404 — UI must not reserve space (FR-009)
