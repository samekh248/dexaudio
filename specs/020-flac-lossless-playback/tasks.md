# Tasks: Lossless FLAC Playback

**Input**: Design documents from `/specs/020-flac-lossless-playback/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not included — the feature spec does not require automated test coverage. Validate manually via `quickstart.md`.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1], [US2], [US3]) for story-phase tasks only

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and extend shared types before foundational work.

- [X] T001 Confirm feature branch `020-flac-lossless-playback` and review design docs in `specs/020-flac-lossless-playback/`
- [X] T002 Add `AudioQualitySchema`, `AudioQuality` type, and `StreamQuerySchema` (`quality: auto | lossless`) in `packages/shared-types/src/api/schemas.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend stream contract, client preference/capability modules, and shared helpers that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `isLosslessCandidateFormat(format)` (returns true for `flac` and `alac`) in `backend/src/services/plex/plex-client.ts`
- [X] T004 Extend `GET /api/v1/stream/:trackId` to parse `?quality=lossless`, prefer `getStreamUrl` before `getTranscodeUrl` for lossless candidates, and set `x-dexaudio-audio-quality: lossless | transcoded` response header in `backend/src/api/routes/stream.ts` per `contracts/stream-endpoint.md`
- [X] T005 [P] Add `StorageKeys.losslessPlayback` (`dexaudio.playback.lossless`) in `frontend/src/lib/local-storage.ts`
- [X] T006 [P] Create `canPlayLossless(format)` using memoized `HTMLAudioElement.canPlayType` probes for FLAC and ALAC in `frontend/src/lib/audio-capability.ts`
- [X] T007 [P] Create `lossless-prefs-store.ts` (Zustand + localStorage, default `{ enabled: true }`) with `isLosslessEnabled()` accessor in `frontend/src/lib/lossless-prefs-store.ts` per `contracts/lossless-preference.md`
- [X] T008 [P] Extend `streamUrlForTrack`, `howlerFormatsForTrack`, `blobMimeForTrack`, and `fetchTrackAudioBlob` with `{ lossless?: boolean }` option (append `?quality=lossless`, mode-specific Howler hints, read `x-dexaudio-audio-quality` header) in `frontend/src/lib/stream-audio.ts`

**Checkpoint**: Foundation ready — backend serves lossless on request; client can build lossless stream URLs and detect browser capability.

---

## Phase 3: User Story 1 — Hear FLAC tracks at original lossless quality (Priority: P1) 🎯 MVP

**Goal**: With lossless enabled (default), FLAC/ALAC tracks play from the original file when the browser can decode them; disabled forces transcoding; non-lossless formats unchanged.

**Independent Test**: Play a FLAC track on a capable browser — Network tab shows `?quality=lossless`, response is `audio/flac`, header `x-dexaudio-audio-quality: lossless`. Disable the setting — same track uses transcoded delivery with no `quality=lossless` param.

### Implementation for User Story 1

- [X] T009 [US1] Add per-load quality decision helper (`shouldAttemptLossless(track)`: pref enabled + `canPlayLossless(format)` + lossless candidate) in `frontend/src/lib/stream-audio.ts` or `frontend/src/lib/audio-capability.ts`
- [X] T010 [US1] Wire `resolveTrackSrc` in `frontend/src/hooks/use-player.ts` to request lossless streams for eligible tracks and pass mode-specific Howler format hints via `bindEngine`
- [X] T011 [US1] Expose `playbackQuality: AudioQuality | null` on the player surface from the stream response header in `frontend/src/hooks/use-player.ts`
- [X] T012 [US1] Request lossless blobs for FLAC/ALAC tracks when `isLosslessEnabled()` in `frontend/src/lib/pre-cache-worker.ts` (FR-015 pre-cache path)
- [X] T013 [US1] Ensure `blobMimeForTrack` returns `audio/mp4` for ALAC cached blobs in `frontend/src/lib/stream-audio.ts`

**Checkpoint**: User Story 1 functional — lossless live playback and lossless pre-cache for capable environments; setting off preserves prior transcoded-only behavior.

---

## Phase 4: User Story 2 — Automatic fallback to transcoding (Priority: P1)

**Goal**: When lossless cannot play (incapable browser, load error, stall beyond recovery window), the player downgrades to transcoded delivery for that track and resumes at the current position without silent failure.

**Independent Test**: With lossless on, simulate each failure mode — incapable browser skips lossless entirely; forced stream error or throttled network triggers transcoded fallback mid-track at current position; next track re-attempts lossless.

### Implementation for User Story 2

- [X] T014 [US2] Add per-load `losslessFallbackRef` and `attemptedMode` tracking; skip lossless when `canPlayLossless` is false (no wasted fetch) in `frontend/src/hooks/use-player.ts`
- [X] T015 [US2] On recoverable lossless load/decode error, set fallback flag and reload track forcing transcoded mode with `initialSeekMs` = current position in `frontend/src/hooks/use-player.ts`
- [X] T016 [US2] On `stallWindowExceeded` while playing lossless, trigger same downgrade-and-resume path (reuse existing `RECOVERY_POLICY.stallWindowMs`) in `frontend/src/hooks/use-player.ts`
- [X] T017 [US2] When cached lossless blob fails to decode, chain existing `useLiveOnCacheError` skip-cache reload with transcoded downgrade in `frontend/src/hooks/use-player.ts`

**Checkpoint**: User Stories 1 AND 2 both work — lossless by default with reliable graceful fallback (required for default-on rollout).

---

## Phase 5: User Story 3 — Understand and control playback quality (Priority: P2)

**Goal**: Listener can toggle lossless preference (persisted, default on) and see whether the current track is lossless or transcoded, including after fallback.

**Independent Test**: Toggle setting in Settings, reload app — preference persists. Play tracks under lossless and transcoded conditions — now-playing indicator matches actual delivery quality.

### Implementation for User Story 3

- [X] T018 [P] [US3] Add labeled **Lossless playback** toggle (shadcn `Switch`) wired to `lossless-prefs-store` in `frontend/src/components/settings/PlaybackSettingsSection.tsx`
- [X] T019 [US3] Replace or extend the existing Cached/Streaming badge with a **Lossless** / **Transcoded** quality indicator (text label, not color-only) in `frontend/src/components/player/AudioPlayer.tsx`
- [X] T020 [US3] Pass `playbackQuality` from player hook through `frontend/src/pages/NowPlayingPage.tsx` to `AudioPlayer.tsx`
- [X] T021 [US3] Ensure preference changes apply on next track load only (no crash mid-playback) by reading live pref at load time in `frontend/src/hooks/use-player.ts`

**Checkpoint**: All three user stories independently functional — lossless delivery, fallback, and transparent user control.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression validation and documentation alignment.

- [X] T022 [P] Verify gapless/crossfade transitions, queue navigation, and Plex/scrobble reporting still work with lossless tracks per `quickstart.md` regression section
- [X] T023 Run full manual validation walkthrough in `specs/020-flac-lossless-playback/quickstart.md` and note any gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T002 shared types) — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — delivers core lossless path
- **User Story 2 (Phase 4)**: Depends on US1 (needs lossless attempt path to downgrade from)
- **User Story 3 (Phase 5)**: Depends on Foundational; can parallelize with US1/US2 for settings toggle (T018), but indicator (T019–T020) needs `playbackQuality` from US1
- **Polish (Phase 6)**: Depends on US1 + US2 minimum (default-on requires fallback); US3 for full feature

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3
- **User Story 2 (P1)**: After US1 — fallback requires an active lossless attempt path
- **User Story 3 (P2)**: Settings toggle (T018) after Foundational; quality indicator after US1 exposes `playbackQuality`

### Within Each User Story

- Backend stream contract (T003–T004) before client lossless requests (T008+)
- `stream-audio.ts` extensions (T008) before `use-player.ts` wiring (T010+)
- US1 lossless load path before US2 downgrade logic
- US1 `playbackQuality` exposure before US3 indicator

### Parallel Opportunities

- **Phase 2**: T005, T006, T007, T008 can run in parallel after T003–T004 (or T005–T007 parallel with T003–T004 if different developers)
- **Phase 3**: T012 and T013 parallel with T009 after T008
- **Phase 5**: T018 parallel with US2 work (different files)
- **Phase 6**: T022 parallel with T023 prep

---

## Parallel Example: Foundational Phase

```bash
# After T003–T004 (backend), launch client foundation in parallel:
Task T005: Add StorageKeys.losslessPlayback in frontend/src/lib/local-storage.ts
Task T006: Create audio-capability.ts
Task T007: Create lossless-prefs-store.ts
Task T008: Extend stream-audio.ts with lossless option
```

---

## Parallel Example: User Story 3 Settings

```bash
# Settings toggle can start as soon as Foundational completes:
Task T018: Add Lossless playback toggle in PlaybackSettingsSection.tsx

# Indicator wiring waits for US1 playbackQuality:
Task T019: Quality indicator in AudioPlayer.tsx
Task T020: Wire through NowPlayingPage.tsx
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

Because lossless defaults **ON** (clarification Q4), shipping US1 without US2 is unsafe — fallback is load-bearing, not optional.

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL**)
3. Complete Phase 3: User Story 1 (lossless delivery)
4. Complete Phase 4: User Story 2 (fallback — **required before demo**)
5. **STOP and VALIDATE** via `quickstart.md` US1 + US2 sections
6. Add Phase 5: User Story 3 (settings + indicator polish)
7. Phase 6: Regression pass

### Incremental Delivery

1. Setup + Foundational → backend + client primitives ready
2. US1 → lossless plays on capable browsers
3. US2 → fallback makes default-on safe to ship
4. US3 → user control and transparency
5. Polish → full regression

### Parallel Team Strategy

With two developers after Foundational:

- **Developer A**: US1 (T009–T013) then US2 (T014–T017)
- **Developer B**: US3 settings toggle (T018) after T007, then indicator (T019–T021) once US1 exposes quality

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same batch
- [Story] label maps task to spec user story for traceability
- No new npm dependencies (Constitution V)
- Pin/offline downloads inherit lossless quality via pre-cache path (T012); `pin-service.ts` promotes existing cache entries only
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
