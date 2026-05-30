# Quickstart: Robust, Reliable Music Playback

How to build, test, and manually verify this refactor. Assumes the existing dexaudio dev setup (Plex connected, frontend + backend workspaces).

## Prerequisites

- Node.js (latest LTS), PostgreSQL running, Plex connected in app settings.
- From repo root, install workspace deps if needed.

## Run

```bash
# Backend (Fastify proxy)
cd backend && npm run dev

# Frontend (Vite PWA) — separate terminal
cd frontend && npm run dev
```

## Test

```bash
# Frontend unit tests (Vitest + Testing Library + fake AudioEngine)
cd frontend && npm test

# Frontend coverage (engine lifecycle must be covered)
cd frontend && npm run test:coverage

# Backend integration tests (supertest) — includes stream Range behavior
cd backend && npm test
```

Key new/updated test files:
- `frontend/tests/unit/playback-machine.test.ts`
- `frontend/tests/unit/recovery-policy.test.ts`
- `frontend/tests/unit/use-player.engine.test.ts`
- `frontend/tests/unit/use-player.recovery.test.ts`
- `frontend/tests/unit/use-player.crossfade.test.ts`
- `frontend/tests/unit/player-context.orchestration.test.tsx`
- `frontend/tests/unit/playback-prefs-store.test.ts`
- `backend/tests/integration/stream-range.test.ts`

## Manual verification (maps to acceptance scenarios)

### US1 — Reliable start & continuity (P1)
1. Play a track from a cold session → audio starts within ~2 s (SC-001).
2. With DevTools, throttle/offline the network briefly mid-track → player shows a brief buffering indicator and resumes from the same position without action (FR-003/SC-003).
3. Force a final failure (e.g., block the stream URL) → brief non-blocking notice appears and the player auto-advances to the next track (FR-005).
4. Reload the page so autoplay is blocked → pressing play starts from the intended position on the first try (FR-013).

### US2 — Correct, smooth transitions (P2)
1. Let a track end naturally → exactly one advance; now-playing + queue match the audio (FR-007/SC-004/SC-006).
2. Spam Next 10× faster than load → lands on and plays the correct final track, no stuck state (FR-008/SC-005).
3. Press Previous after >3 s → restarts current; press within ≤3 s → goes to previous track (US2 scenario 3).
4. Set transition = crossfade in Settings → next transition overlaps outgoing/incoming audio over the configured duration, on both natural end and manual Next (FR-009).
5. Change transition style while playing → the very next transition uses the new style without reload (FR-010/SC-008).

### US3 — Responsive controls & seeking (P3)
1. While a track is still loading, toggle pause/play → state stays consistent; audio reflects the final request once ready (FR-011).
2. Seek to a late position in a long track → audio resumes there within ~1 s; displayed position matches (FR-012/SC-007). Confirm a `206 Partial Content` response in the Network tab for the Range request.
3. Seek rapidly several times → settles on the last requested position, UI and audio in sync.

## Definition of done

- All acceptance scenarios above verified.
- New tests pass; engine lifecycle (load/play/pause/seek/transition/error/retry/recovery) is covered (SC-010).
- No regression in gapless, caching/pre-cache, session restore, or autoplay handling.
- Constitution Check still passes (no new dependencies).
