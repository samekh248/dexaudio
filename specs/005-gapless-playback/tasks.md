# Tasks: Gapless Playback

**Input**: Design documents from `/specs/005-gapless-playback/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/playback-preferences.yaml, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted; polish includes manual validation per quickstart.md.

**Organization**: Tasks grouped by user story. US1 (seamless transitions) is the MVP and depends on foundational cache/player infrastructure. US2 (Settings toggle) can ship in parallel once foundation is ready but is required for manual SC verification. US3 (all queue sources) extends wiring after US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preference key and gapless slot builder used by cache and player layers.

- [ ] T001 Add `gaplessPlayback` key (`dexaudio.playback.gapless`, default `false`) to `StorageKeys` and export type `GaplessPlaybackPreference` in `frontend/src/lib/local-storage.ts`
- [ ] T002 [P] Create `buildGaplessSlots(queueLength, currentIndex)` returning ordered `{ priority, queueIndex, trackId }[]` for slots (+1, -1, +2, -2) filtered to valid indices in `frontend/src/lib/gapless-cache-slots.ts`

**Checkpoint**: Slot builder and storage key ready for foundational pre-cache work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bidirectional priority pre-cache and protected eviction — MUST complete before user story playback handoff.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Extend `selectEvictionCandidates` in `frontend/src/lib/cache-lru.ts` to accept optional `protectedKeys: Set<string>` and evict non-protected pre-cache LRU entries before protected ones
- [ ] T004 Add `ensurePreCacheSpace(neededBytes, protectedKeys)` in `frontend/src/lib/cache-service.ts` that calls protected-aware eviction before `writeToCache`; never delete `cache_kind === "permanent"` or `pinned` entries
- [ ] T005 Refactor `frontend/src/lib/pre-cache-worker.ts`: export `preCacheGaplessNeighbors(tracks, currentIndex, generation)` that serial-fetches slots in priority order when `getItem(StorageKeys.gaplessPlayback)` is true; retain existing forward-only `preCacheUpcoming` when false; use `effectiveLookAhead = max(userLookAhead, 2)` when gapless on
- [ ] T006 Pass `protectedKeys` from current gapless slot track IDs into `ensurePreCacheSpace` / `writeToCache` in `frontend/src/lib/pre-cache-worker.ts`; cancel in-flight work when `generation` changes

**Checkpoint**: Pre-cache honors four-slot priority, min forward depth 2, and protected eviction. Pinned permanent cache untouched.

---

## Phase 3: User Story 1 — Seamless transitions between queued tracks (Priority: P1) 🎯 MVP

**Goal**: With gapless enabled, forward transitions (natural end, Next) start the next track without perceptible silence when preparation succeeds; silent degrade otherwise.

**Independent Test**: Enable gapless (localStorage or Settings after US2). Play two+ tracks; let track 1 end naturally — track 2 starts with no audible gap. Press Next — same handoff. Disable gapless — brief gap returns.

### Implementation for User Story 1

- [ ] T007 [US1] Add `stagedForwardRef`, `stagedBackwardRef`, `stagedGenerationRef`, and `isGaplessEnabled()` helper in `frontend/src/hooks/use-player.ts`
- [ ] T008 [US1] Implement `preloadStagedTrack(track, direction)` that builds blob/Howl without unloading active playback; store `state === 'loaded'` before marking ready in `frontend/src/hooks/use-player.ts`
- [ ] T009 [US1] Implement `handoffToStaged(direction): boolean` promoting staged Howl to `howlRef` and playing immediately; async-unload outgoing instance; return false to trigger `loadTrack` fallback in `frontend/src/hooks/use-player.ts`
- [ ] T010 [US1] Export `preloadForward(track)` / `preloadBackward(track)` wrappers that no-op when gapless off in `frontend/src/hooks/use-player.ts`
- [ ] T011 [US1] Ensure `fadeOut` calls callback immediately (no fade) when gapless enabled, matching crossfade-off behavior in `frontend/src/hooks/use-player.ts`
- [ ] T012 [US1] Update `frontend/src/pages/NowPlayingPage.tsx` `useEffect` on `current?.id` / `currentIndex`: call `preCacheGaplessNeighbors` (or `preCacheUpcoming`) and `player.preloadForward` for `items[currentIndex + 1]` when gapless on
- [ ] T013 [US1] Change track-load `useEffect` to pass `onEnd` that calls `handoffToStaged('forward')` then `next()` on success, else existing `loadTrack` + `next()` flow in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T014 [US1] Wire `AudioPlayer` `onNext` to attempt `handoffToStaged('forward')` before `next()` when gapless on and staged target matches `items[currentIndex + 1]` in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T015 [US1] Wire `onPrevious` to `handoffToStaged('backward')` when jumping to `currentIndex - 1` with staged hit; else keep restart-at-0 / `previous()` + load behavior in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T016 [US1] Cancel staged preloads when `loadGeneration` or `currentIndex` changes (queue play-now, rapid skip) in `frontend/src/pages/NowPlayingPage.tsx` and `frontend/src/hooks/use-player.ts`

**Checkpoint**: Forward gapless handoff works for natural end and Next. Previous gapless when staged. Fallback silent degrade intact.

---

## Phase 4: User Story 2 — User controls gapless playback in Settings (Priority: P1)

**Goal**: Labeled gapless toggle in Playback settings (default off), persisted; mutual exclusion with crossfade and Sonner notice.

**Independent Test**: Settings → Playback → toggle gapless on/off; reload app — preference persists. Enabling gapless disables crossfade with toast; enabling crossfade disables gapless with toast.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Add Gapless playback `Switch`, helper description text, and `aria-describedby` in `frontend/src/components/settings/PlaybackSettingsSection.tsx`
- [ ] T018 [US2] On gapless enable: set `crossfade.enabled = false`, persist both keys, `toast()` explaining mutex in `frontend/src/components/settings/PlaybackSettingsSection.tsx`
- [ ] T019 [US2] On crossfade enable: set `gaplessPlayback = false`, persist both keys, reciprocal `toast()` in `frontend/src/components/settings/PlaybackSettingsSection.tsx`
- [ ] T020 [US2] Re-read gapless flag on toggle (no interrupt of current track); trigger neighbor pre-cache on enable via optional callback or rely on next index effect in `frontend/src/components/settings/PlaybackSettingsSection.tsx`

**Checkpoint**: SC-004 and SC-005 satisfied. Users can opt in without editing localStorage manually.

---

## Phase 5: User Story 3 — Gapless works with existing queue flows (Priority: P2)

**Goal**: Gapless pre-cache and handoff apply regardless of queue source (album play-now, add-to-queue, auto-queued similar).

**Independent Test**: Enable gapless. Play album via play-now, append search tracks, let auto-queue append similar — transitions stay seamless at each boundary where a next track exists.

### Implementation for User Story 3

- [ ] T021 [US3] Add `items.length` and `loadGeneration` to pre-cache `useEffect` dependencies so queue append/reorder retriggers `preCacheGaplessNeighbors` in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T022 [US3] After `addAutoTracks` resolves in existing similar-song effect, re-run gapless pre-cache for updated queue tail in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T023 [US3] Preload backward slot (priority 2) via `player.preloadBackward` for `items[currentIndex - 1]` when gapless on and index &gt; 0 in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T024 [US3] Verify `QueuePanel` `onSelect` / `setIndex` path triggers staged preload for new current index (same `useEffect` covers it); fix deps if index-only selection skips preload in `frontend/src/pages/NowPlayingPage.tsx`

**Checkpoint**: All queue advance paths share one index-driven gapless pipeline. Cached next track from pre-cache used by staged Howl.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Observability, regression, and success-criteria validation.

- [ ] T025 [P] Add `console.debug` logs for gapless handoff hit, miss (fallback), and staged cancel in `frontend/src/hooks/use-player.ts`
- [ ] T026 [P] Document client preference keys in code comment referencing `specs/005-gapless-playback/contracts/playback-preferences.yaml` in `frontend/src/lib/local-storage.ts`
- [ ] T027 Run manual smoke test per `specs/005-gapless-playback/quickstart.md` (10-track SC-001 spot check, gapless off regression SC-003)
- [ ] T028 Confirm no gapless-specific toast on preparation timeout (FR-010a); hard errors still use 004 toast/banner paths only

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — MVP
- **US2 (Phase 4)**: Depends on Phase 2; independently testable with US1 (toggle enables US1 behavior)
- **US3 (Phase 5)**: Depends on US1 handoff + Phase 2 pre-cache
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

| Story | Depends on | Can test alone with |
|-------|------------|---------------------|
| US1 | Phase 2 | `localStorage` gapless `true` before US2 UI |
| US2 | Phase 2 | Toggle only (playback unchanged until enabled) |
| US3 | US1 + Phase 2 | Full queue flows with gapless on |

### Within Each User Story

- Foundation before player staging
- `use-player.ts` handoff APIs before `NowPlayingPage.tsx` wiring
- US2 mutex can parallel US1 code in different files after T005

### Parallel Opportunities

- **Phase 1**: T001 and T002 in parallel
- **Phase 2**: T003 and T004 in parallel, then T005–T006
- **US1**: T007–T011 (`use-player.ts`) before T012–T016 (`NowPlayingPage.tsx`)
- **US2**: T017 parallel with late US1 tasks (different files)
- **Polish**: T025 and T026 in parallel

---

## Parallel Example: User Story 1

```bash
# After Phase 2, start player core:
Task T007–T011 in frontend/src/hooks/use-player.ts

# Then wire page (depends on exported preload/handoff):
Task T012–T016 in frontend/src/pages/NowPlayingPage.tsx
```

---

## Parallel Example: User Story 2 + US1 tail

```bash
# Different files after use-player exports exist:
Task T017–T020 in frontend/src/components/settings/PlaybackSettingsSection.tsx
Task T014–T015 in frontend/src/pages/NowPlayingPage.tsx  # if handoff APIs ready
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical**)
3. Complete Phase 3: User Story 1
4. Set `dexaudio.playback.gapless` to `true` in devtools OR complete US2 toggle
5. **STOP and VALIDATE**: natural end + Next on 2-track queue
6. Demo if ready

### Incremental Delivery

1. Setup + Foundational → cache policy ready
2. US1 → seamless forward transitions (MVP)
3. US2 → Settings toggle + crossfade mutex
4. US3 → all queue sources + backward preload
5. Polish → quickstart + SC regression

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3) plus minimal US2 toggle (T017–T019) for tester-friendly validation.

---

## Notes

- No backend or `packages/shared-types` changes required
- Feature 004 (`use-player`, `NowPlayingPage`, pre-cache) must be present on branch
- Howler staging pattern per `research.md` R-001
- Silent degrade only — never add gapless-specific user toasts beyond crossfade mutex (FR-010a, FR-011)
