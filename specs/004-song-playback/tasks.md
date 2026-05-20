# Tasks: Song Playback

**Input**: Design documents from `/specs/004-song-playback/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/openapi.yaml

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story. All three user stories are P1 but have a natural dependency: US1 (audio plays) must work before US2 (state accuracy) can be verified and US3 (error messages) can be tested on real failures.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend shared types and backend format detection so all three user stories have the data structures they need.

- [ ] T001 [P] Extend `TrackFormatSchema` enum to add `aac`, `ogg`, `wav`, `alac`, `wma` values in `packages/shared-types/src/api/schemas.ts`
- [ ] T002 [P] Add `PlaybackErrorCategorySchema` enum (`unsupported_format`, `server_unreachable`, `auth_expired`, `track_not_found`, `network_interrupted`, `autoplay_blocked`, `unknown`) in `packages/shared-types/src/api/schemas.ts`
- [ ] T003 [P] Add `PlaybackAffordanceSchema` enum (`skip`, `retry`, `sign_in`, `back_to_library`, `retry_queue`, `play_gesture`) in `packages/shared-types/src/api/schemas.ts`
- [ ] T004 Add `PlaybackFailureSchema` object type (category, message, trackTitle?, trackArtist?, trackId?, technicalDetail?, affordances, timestamp) in `packages/shared-types/src/api/schemas.ts`

**Checkpoint**: Shared types ready. All three user stories can reference these types.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend changes that MUST be complete before any frontend user story work. Expands format detection and adds Plex transcoding fallback.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Expand codec-to-format mapping in `parseTrackFromMetadata` to detect `aac`/`m4a` → `aac`, `ogg`/`opus`/`vorbis` → `ogg`, `wav`/`wave` → `wav`, `alac` → `alac`, `wma`/`wmav2` → `wma` in `backend/src/services/plex/plex-client.ts`
- [ ] T006 Add `getTranscodeUrl(config: PlexConfig, trackId: string, bitrate?: number): string` function that constructs the Plex universal transcode URL (`/music/:/transcode/universal/start.mp3?path=...&protocol=http&musicBitrate=320`) in `backend/src/services/plex/plex-client.ts`
- [ ] T007 Add `isBrowserNativeFormat(format: TrackFormat): boolean` helper that returns `true` for `flac`, `mp3`, `aac`, `ogg` in `backend/src/services/plex/plex-client.ts`
- [ ] T008 Refactor `GET /stream/:trackId` to: (1) fetch track metadata from Plex to determine codec, (2) direct-stream if browser-native, (3) fall back to transcode URL via `getTranscodeUrl` if non-native, (4) return structured `ErrorBody` with appropriate status codes (401 `AUTH_EXPIRED`, 404 `NOT_FOUND`, 415 `UNSUPPORTED_FORMAT`, 502 `BAD_GATEWAY`) per `contracts/openapi.yaml` in `backend/src/api/routes/stream.ts`

**Checkpoint**: Backend streams any format Plex supports. Frontend can consume audio from `/api/v1/stream/:trackId` for all codecs. Error responses are structured.

---

## Phase 3: User Story 1 — Selecting a song actually plays audio (Priority: P1) 🎯 MVP

**Goal**: Clicking play on any track produces audible audio within 2 seconds. Tracks auto-advance. Rapid clicks don't overlap. Volume persists.

**Independent Test**: Click any play affordance (album card, track row, queue item). Audio begins within 2 seconds. Now Playing view shows the track. Track auto-advances when it ends. Clicking Next/Previous works. Volume survives track changes.

### Implementation for User Story 1

- [ ] T009 [US1] Add `loading`, `error` state fields and `loadIdRef` (incrementing counter) to `usePlayer` hook; initialize volume from `localStorage` key `dexaudio.volume` (default 1) using existing `getItem` helper in `frontend/src/hooks/use-player.ts`
- [ ] T010 [US1] Refactor `loadTrack` to: (1) increment `loadIdRef`, (2) capture local `loadId`, (3) call `unload()`, (4) set `loading: true`, (5) check cache, (6) at each async boundary bail out if `loadIdRef.current !== loadId`, (7) create `Howl` with `onloaderror`/`onplayerror` callbacks, (8) call `howl.play()` immediately after creation, (9) set `loading: false` on `onload` in `frontend/src/hooks/use-player.ts`
- [ ] T011 [US1] Add `AbortController` to `loadTrack` so in-flight fetch to `/api/v1/stream/{trackId}` is cancelled when a new `loadTrack` call supersedes it; abort the previous controller at the start of each `loadTrack` in `frontend/src/hooks/use-player.ts`
- [ ] T012 [US1] Persist volume to `localStorage` on every `setVolume` call using existing `setItem` helper; pass stored volume to each new `Howl({ volume })` in `frontend/src/hooks/use-player.ts`
- [ ] T013 [US1] Update `NowPlayingPage` `useEffect` to remove the separate `player.play()` call from the `onEnd` callback (no longer needed since `loadTrack` auto-plays); ensure `onEnd` calls `next()` which triggers the `current?.id` effect to auto-load the next track in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T014 [US1] Handle "Previous" correctly: when `previous()` changes `currentIndex`, the existing `useEffect` on `current?.id` should trigger `loadTrack` for the new track; verify the Previous button wiring calls `previous()` (not just `player.fadeOut`) in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T015 [US1] Handle same-track restart (FR-022): detect when the user clicks play on the already-playing track (same `track.id`) and force `loadTrack` to run by using a restart counter or clearing the howl first, so the `useEffect` dependency fires even when `current?.id` hasn't changed in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T016 [US1] Add cache-corruption fallback (FR-024): in `loadTrack`, if `readFromCache` returns a blob but the Howl's `onloaderror` fires, retry with the live stream URL `/api/v1/stream/{trackId}` before surfacing an error in `frontend/src/hooks/use-player.ts`

**Checkpoint**: Audio plays on click. Tracks auto-advance. No overlapping audio on rapid clicks. Volume persists. Cache fallback works. Same-track restarts.

---

## Phase 4: User Story 2 — Now Playing view accurately reflects playback state (Priority: P1)

**Goal**: The Now Playing view always shows the correct track, play/pause state, elapsed time, duration, and queue position in sync with the actual audio.

**Independent Test**: With audio playing, verify displayed title/artist/album match the audible track; play/pause indicator matches audio state; elapsed time advances at 1 second/second; duration matches true length; queue highlights the active track; seek jumps to the correct position; volume changes persist across tracks.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Add cover art display to the Now Playing view: render album art from `current.artUrl` (proxied via `/api/v1/plex/photo`) above the track title; use shadcn/ui `AspectRatio` for consistent sizing in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T018 [US2] Update the position polling interval in `usePlayer` from 500 ms to 250 ms for tighter elapsed-time accuracy (SC-006: ±1 s over 10 min); ensure `setPosition` rounds to the nearest millisecond in `frontend/src/hooks/use-player.ts`
- [ ] T019 [US2] Fix duration reporting: use `onload` to set initial duration from `howl.duration() * 1000`, then update duration again after first play if it differs (some codecs report accurate duration only after decode starts) in `frontend/src/hooks/use-player.ts`
- [ ] T020 [US2] Ensure play/pause UI state is always synchronized: verify `onplay` sets `playing: true`, `onpause` sets `playing: false`, `onend` sets `playing: false`; add `onstop` callback that also sets `playing: false` in `frontend/src/hooks/use-player.ts`
- [ ] T021 [US2] Verify seek accuracy: after `howl.seek(ms / 1000)`, immediately update both `position` state and call `updateListenPosition(ms)` so the UI counter and scrobble tracker are in sync in `frontend/src/hooks/use-player.ts`
- [ ] T022 [US2] Verify queue panel active-track highlighting updates on auto-advance: the `currentIndex` change from `next()` must trigger a re-render of `QueuePanel` with the new `currentIndex` — confirm the prop flow from `usePlaybackQueue` → `NowPlayingPage` → `QueuePanel` in `frontend/src/pages/NowPlayingPage.tsx`

**Checkpoint**: All Now Playing view state matches the audio output. Elapsed time, duration, play/pause, queue position, seek, and volume are accurate.

---

## Phase 5: User Story 3 — Playback failures show a clear, actionable message (Priority: P1)

**Goal**: Every playback failure produces a user-visible message within 5 seconds, identifying the cause, the affected track, and offering a next step. Individual track failures auto-skip with a toast. Session-level failures show a blocking inline banner.

**Independent Test**: Attempt to play an unplayable track (unsupported format, server unreachable, auth expired). A message appears within 5 seconds naming the cause, the track, and a next step. Dismiss or act on the message and it clears.

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create error classification module with `classifyPlaybackError(source: 'api' | 'howler', error: ApiError | number | string, track?: Track): PlaybackFailure` that maps API status codes (401→auth_expired, 404→track_not_found, 415→unsupported_format, 502→server_unreachable) and Howler error codes (2→network_interrupted, 3→unsupported_format, 4→unknown) to `PlaybackFailure` objects with appropriate affordances and user messages in `frontend/src/lib/playback-errors.ts`
- [ ] T024 [P] [US3] Add `isSessionLevelError(category: PlaybackErrorCategory): boolean` helper that returns `true` for `server_unreachable`, `auth_expired`, `network_interrupted`, `autoplay_blocked` in `frontend/src/lib/playback-errors.ts`
- [ ] T025 [P] [US3] Add shadcn/ui Sonner toast component if not already present; configure with `position="bottom-right"`, `duration={5000}`, ARIA live region for accessibility in `frontend/src/components/ui/sonner.tsx` and mount `<Toaster />` in `frontend/src/App.tsx`
- [ ] T026 [P] [US3] Create `PlaybackErrorBanner` component that renders an inline banner in the Now Playing view for session-level errors: shows error message, affected track, affordance buttons (Retry, Sign in, Back to library), and a collapsible "See details" section with `technicalDetail`; uses shadcn/ui `Button` and `Alert`; includes ARIA live region (`role="alert"`) in `frontend/src/components/player/PlaybackErrorBanner.tsx`
- [ ] T027 [US3] Wire `onloaderror` and `onplayerror` Howler callbacks in `loadTrack` to call `classifyPlaybackError` and set the `error` state on the `usePlayer` hook; add `clearError` function that resets `error` to null in `frontend/src/hooks/use-player.ts`
- [ ] T028 [US3] Add autoplay detection: in the `onplayerror` callback, check if `Howler.ctx?.state === 'suspended'` or error message matches autoplay patterns; if so, set `autoplayBlocked: true` instead of a normal error; add `resumeAutoplay` function that calls `Howler.ctx?.resume()` then `howl.play()` and clears `autoplayBlocked` in `frontend/src/hooks/use-player.ts`
- [ ] T029 [US3] Add `skippedIndices: Set<number>` and `markSkipped(index: number)` action to the playback queue store for tracking auto-skipped tracks; add `resetSkipped()` that clears the set (called on `playNow`) in `frontend/src/stores/playback-queue-store.ts`
- [ ] T030 [US3] Wire error handling into `NowPlayingPage`: (1) on `player.error` change, if individual-track error → show toast via Sonner with track title/artist/reason, call `markSkipped(currentIndex)`, call `next()` to auto-skip; (2) if session-level error → render `PlaybackErrorBanner` with affordance handlers (retry → re-call `loadTrack`, sign_in → navigate to `/settings`, back_to_library → navigate to `/`); (3) if `autoplayBlocked` → render a prominent "Play" button that calls `player.resumeAutoplay()` in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T031 [US3] Implement all-failed-queue terminal state (FR-017): after `next()` is called from auto-skip, check if `skippedIndices.size >= items.length` (all items skipped or failing); if so, display terminal message "No queued tracks could be played" with "Back to library" and "Retry queue" affordances instead of auto-advancing in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T032 [US3] Implement error dismissal (FR-019): when a successful play action occurs (new track loads and plays), automatically clear any visible error state (`player.clearError()`); when user clicks dismiss on a toast or banner, clear the error in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T033 [US3] Add mid-stream error recovery (R-007): in `onloaderror`, if `position > 0` (playback had started), attempt one retry by calling `loadTrack` again with the same track; if the retry also fails, surface the error; for cache failures, fall back to live stream before surfacing the error in `frontend/src/hooks/use-player.ts`
- [ ] T034 [US3] Add error logging (FR-025): on every `PlaybackFailure` creation, call `console.error` with a structured log containing category, trackId, technicalDetail, and timestamp so operators can investigate in `frontend/src/lib/playback-errors.ts`

**Checkpoint**: Every failure type produces a visible, actionable message. Individual tracks auto-skip with toast. Session errors show blocking banner. Autoplay block shows Play button. All-failed queue shows terminal message.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, accessibility, and verification across all stories.

- [ ] T035 [P] Add `aria-live="polite"` to the elapsed-time counter and `aria-live="assertive"` to the error banner in `frontend/src/components/player/AudioPlayer.tsx` and `frontend/src/components/player/PlaybackErrorBanner.tsx`
- [ ] T036 [P] Ensure the "Retry queue" affordance resets `skippedIndices`, sets `currentIndex` to 0, and triggers `loadTrack` for the first item in `frontend/src/pages/NowPlayingPage.tsx`
- [ ] T037 Verify responsive layout of error banner and autoplay-blocked overlay at 320 px viewport width; adjust Tailwind classes if needed in `frontend/src/components/player/PlaybackErrorBanner.tsx`
- [ ] T038 Run manual smoke test per `quickstart.md`: play album → audio starts → track auto-advances → next/previous work → error banner on disconnected server → toast on unsupported track

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (shared types) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — MVP, must complete first
- **US2 (Phase 4)**: Depends on Phase 2; works best after US1 (needs audio playing to verify state accuracy)
- **US3 (Phase 5)**: Depends on Phase 2; works best after US1 (needs playback pipeline to test error paths)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1**: Can start after Phase 2 — no dependencies on other stories; this is the MVP
- **US2**: Can start after Phase 2 — partially independent but most acceptance scenarios require audio to actually play (US1)
- **US3**: Can start after Phase 2 — error classification module (T023–T024) is independent, but wiring errors into NowPlayingPage (T030–T033) requires the `usePlayer` changes from US1

### Within Each User Story

- Shared types (Phase 1) → Backend (Phase 2) → Frontend hook changes → Page-level wiring
- Error classification module (T023–T024) can be built in parallel with US1 implementation
- Banner component (T026) can be built in parallel with US1 implementation

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel (different Zod schemas, same file but no conflicts)
- **Phase 2**: T005, T006, T007 are in the same file but logically independent — can be parallelized by a single agent
- **Phase 3**: T009–T012 modify `use-player.ts` sequentially; T013–T015 modify `NowPlayingPage.tsx` sequentially
- **Phase 4**: T017 (cover art) can run in parallel with T018–T021 (hook accuracy fixes)
- **Phase 5**: T023–T024 (error module), T025 (Sonner), T026 (banner component) can all run in parallel since they're different files
- **Phase 6**: T035, T036, T037 can run in parallel

---

## Parallel Example: User Story 3

```bash
# These can run in parallel (different files):
Task: "T023 — Create error classification module in frontend/src/lib/playback-errors.ts"
Task: "T025 — Add shadcn/ui Sonner toast in frontend/src/components/ui/sonner.tsx"
Task: "T026 — Create PlaybackErrorBanner in frontend/src/components/player/PlaybackErrorBanner.tsx"

# Then sequentially (depend on above):
Task: "T027 — Wire Howler error callbacks in use-player.ts"
Task: "T030 — Wire error handling into NowPlayingPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shared types) — ~4 tasks
2. Complete Phase 2: Foundational (backend stream improvements) — ~4 tasks
3. Complete Phase 3: User Story 1 (core playback) — ~8 tasks
4. **STOP and VALIDATE**: Click play → audio starts within 2 s → tracks auto-advance → no overlaps
5. Deploy/demo if ready — the app now plays music

### Incremental Delivery

1. Setup + Foundational → Backend ready for all codecs
2. Add US1 → Audio plays, tracks advance → **Deploy (MVP!)**
3. Add US2 → State display is accurate → Deploy
4. Add US3 → Errors are visible and actionable → Deploy
5. Polish → Accessibility, edge cases → Final release

### Suggested MVP Scope

User Story 1 alone (Phases 1–3, tasks T001–T016) delivers the core value: clicking play produces audio. This is the most impactful increment and should be validated before proceeding.
