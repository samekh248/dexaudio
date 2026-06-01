# Implementation Plan: Lossless FLAC Playback

**Branch**: `020-flac-lossless-playback` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-flac-lossless-playback/spec.md`

## Summary

Today every FLAC/ALAC track is forced through Plex's MP3 transcode (`getTranscodeUrl`, 320 kbps) because the player treats those formats as non-browser-native. This feature lets listeners hear FLAC and ALAC at original lossless quality by streaming the **original file** (`getStreamUrl`, which already exists on the backend) directly to the HTML5 audio element, gated behind a configurable, **default-on** preference.

Technical approach: the frontend decides whether to attempt lossless per track (preference enabled AND format is FLAC/ALAC AND the current browser can decode it via `HTMLAudioElement.canPlayType`). When attempting lossless it requests `GET /api/v1/stream/:trackId?quality=lossless`; the backend serves the original file and returns a quality header. If the lossless attempt errors or stalls beyond the **existing** recovery window, the player downgrades that track to the current transcoded method and resumes at the listener's current position. Pre-cache/pin downloads store lossless for supported formats when the preference is on. No new dependencies; all changes reuse Howler, the existing recovery state machine, IndexedDB cache, localStorage prefs, and shadcn UI.

## Technical Context

**Language/Version**: TypeScript (strict) on both ends. Frontend React (latest stable, Vite); Backend Node.js LTS + Fastify.

**Primary Dependencies**: Howler.js (audio engine), Zustand (stores), shadcn/ui + Tailwind (UI), Zod (shared API schemas), IndexedDB (audio cache), Plex HTTP API (upstream). All already present.

**Storage**: `localStorage` for the lossless preference (consistent with existing playback prefs); IndexedDB (`dexaudio-cache`) for audio blobs. No PostgreSQL changes (preference is a client UI flag, not a secret).

**Testing**: Vitest unit tests (frontend `frontend/tests/unit`, backend `backend/test`), existing fake-audio-engine harness for player recovery tests.

**Target Platform**: Installable offline-first PWA across modern evergreen browsers (Chrome/Edge/Firefox decode FLAC; Safari 16+ decodes FLAC and ALAC in MP4). Mobile through desktop.

**Project Type**: Web application (separate `frontend/` and `backend/` packages with a shared `packages/shared-types`).

**Performance Goals**: Time-to-first-audio for a lossless attempt that ends up falling back stays within a small margin of a normal transcoded start (SC-007). Lossless files are larger; rely on HTML5 progressive streaming (no full-buffer wait).

**Constraints**: Offline-capable (cached lossless plays without network); fallback must be seamless and resume at position; no regressions to gapless/crossfade, queue, caching, or scrobble/Plex reporting (FR-014).

**Scale/Scope**: Single-user-per-instance music player. Scope is FLAC + ALAC only for v1; ~6–8 frontend files touched, 2 backend files, 1 shared-types enum addition, 1 settings control.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass (no version change) |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass (preference is a client flag; no new store) |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass (reuse `Switch`, `Label`, `Badge`) |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | N/A (no custom components) |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass (adds a query param to existing versioned endpoint) |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass (add `AudioQuality` type + stream query schema to `shared-types`) |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass (labeled toggle; quality indicator has text, not color-only) |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass (cached lossless plays offline; fallback only needs network) |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass (settings + badge inherit responsive layout) |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass (zero new dependencies) |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | N/A (none added) |

**Result**: All gates pass. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/020-flac-lossless-playback/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── stream-endpoint.md
│   └── lossless-preference.md
├── checklists/
│   └── requirements.md   # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/shared-types/src/api/
└── schemas.ts                         # Add AudioQuality enum + stream query schema

backend/src/
├── services/plex/plex-client.ts       # Add isLosslessCandidateFormat(); reuse getStreamUrl/getTranscodeUrl
└── api/routes/stream.ts               # Honor ?quality=lossless; set X-Dexaudio-Audio-Quality header

frontend/src/
├── lib/
│   ├── lossless-prefs-store.ts        # NEW: Zustand store for lossless preference (localStorage)
│   ├── audio-capability.ts            # NEW: canPlayLossless(format) via canPlayType
│   ├── stream-audio.ts                # streamUrlForTrack(id, {lossless}); howlerFormats for lossless; fetchTrackAudioBlob({lossless})
│   └── local-storage.ts               # Add StorageKeys.losslessPlayback
├── hooks/
│   └── use-player.ts                  # Per-load quality mode + lossless→transcoded downgrade resuming at position
├── lib/pre-cache-worker.ts            # Request lossless for supported formats when enabled
├── lib/pin-service.ts                 # Request lossless for supported formats when enabled (pinned downloads)
├── components/settings/PlaybackSettingsSection.tsx  # Lossless toggle (shadcn Switch)
└── components/player/AudioPlayer.tsx  # Quality indicator (lossless/transcoded badge)

frontend/tests/unit/                   # New unit tests (capability, prefs, downgrade, stream url, backend route)
backend/test/                          # Stream route lossless/transcoded selection tests
```

**Structure Decision**: Web application layout (existing). Changes are additive and localized: one shared-types enum, two backend functions/routes, a handful of frontend lib/hook/UI files. No directory restructuring.

## Complexity Tracking

> No constitution violations. Section intentionally empty.

## Phase 0 — Research

See [research.md](./research.md). Resolves: browser lossless decode detection, Howler format hints for FLAC/ALAC, how to express lossless intent over the existing REST endpoint, how to integrate downgrade into the existing recovery state machine without regressions, and cache/pin quality behavior.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — Lossless Playback Preference, Track Playback Quality, Playback Capability.
- [contracts/stream-endpoint.md](./contracts/stream-endpoint.md) — `?quality` param + response quality header.
- [contracts/lossless-preference.md](./contracts/lossless-preference.md) — client preference shape and defaults.
- [quickstart.md](./quickstart.md) — manual verification walkthrough mapped to user stories.
- Agent context updated: `.cursor/rules/specify-rules.mdc` SPECKIT block points to this plan.
