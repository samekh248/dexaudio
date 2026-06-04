# Implementation Plan: Now Playing Waveform

**Branch**: `026-now-playing-waveform` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-now-playing-waveform/spec.md`

## Summary

Add a **two-tone waveform** above the Now Playing seek slider when Plex provides loudness analysis for the current track. Played vs unplayed segments follow playback position; **click-to-seek** (no waveform drag-scrub); **hover time preview**; no placeholder while loading. Data comes from Plex `GET /library/streams/{audioStreamId}/levels`, proxied via new **`GET /api/v1/library/tracks/:trackId/waveform`**. Frontend-only visualization uses a small custom `TrackWaveform` component (canvas/SVG, no new dependencies); progress bar remains the accessible primary control.

## Technical Context

**Language/Version**: TypeScript (strict). React 19 frontend (Vite); Node.js LTS + Fastify backend.

**Primary Dependencies**: Existing stack — Fastify, Zod (`shared-types`), shadcn `Slider` + `Tooltip`, Tailwind, Plex HTTP API. **No new npm packages.**

**Storage**: None (no PostgreSQL). Optional in-memory `Map` cache in `useTrackWaveform` for revisits.

**Testing**: Vitest — backend unit tests for Plex levels parsing + route; frontend unit tests for seek mapping, drag-no-op, `seekDisabled`, hook state machine.

**Target Platform**: PWA, 320px–desktop; pointer hover for time preview; touch click-to-seek without hover.

**Project Type**: Web application (`frontend/` + `backend/` + `packages/shared-types`).

**Performance Goals**: Waveform fetch p95 < 500ms on typical LAN; UI redraw on position change without full 60fps canvas repaint (split index only).

**Constraints**: FR-008 Now Playing only; FR-009 no skeleton; remote `seekDisabled` parity; theme-colored bars; supplementary a11y (`aria-hidden` waveform).

**Scale/Scope**: ~2 backend modules, 1 route, 3–4 frontend files, shared-types schema; no changes to stream/queue/scrobble pipelines.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass (no DB) |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — reuse `Slider`, `Tooltip`; custom `TrackWaveform` justified (no shadcn waveform) |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — new `GET /api/v1/library/tracks/:trackId/waveform` |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — `TrackWaveformSchema` in `shared-types` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — progress bar primary; waveform supplementary per FR-010 |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — waveform optional; fails hidden without blocking playback |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — full-width bars, min height ~48px narrow |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | N/A |

**Post–Phase 1 re-check**: PASS — design uses existing Plex proxy patterns and player seek hooks only.

## Project Structure

### Documentation (this feature)

```text
specs/026-now-playing-waveform/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── waveform-endpoint.md
│   └── ui-track-waveform.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/shared-types/src/api/
└── schemas.ts                    # TrackWaveformSchema, TrackWaveformQuerySchema

backend/src/
├── services/plex/
│   ├── plex-client.ts            # parseAudioStreamIdFromTrackXml; fetchStreamLevels; normalizeLevels
│   └── track-waveform-service.ts # NEW: orchestrate context + levels → TrackWaveform
├── api/routes/
│   └── library.ts                # GET /library/tracks/:trackId/waveform
└── tests/unit/
    ├── plex-waveform-parser.test.ts   # NEW
    └── track-waveform-route.test.ts   # NEW (or integration)

frontend/src/
├── hooks/
│   └── use-track-waveform.ts     # NEW: fetch + cache + status machine
├── components/player/
│   ├── TrackWaveform.tsx         # NEW: bars, hover time, click seek
│   └── AudioPlayer.tsx           # MODIFY: optional trackId, stack waveform above Slider
├── pages/
│   └── NowPlayingPage.tsx        # MODIFY: pass trackId to AudioPlayer
└── tests/unit/
    ├── TrackWaveform.test.tsx    # NEW
    └── use-track-waveform.test.ts # NEW
```

**Structure Decision**: Standard Dexaudio web layout. Backend extends Plex client and library routes (same as art proxy and stream). Frontend keeps seek logic in existing `onSeek` from `usePlayer`; waveform is presentational + click mapping only.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| `TrackWaveform` custom component | Bar chart with played/unplayed clip + click/hover mapping | shadcn has no waveform; raw `<img>` unavailable from Plex |
| `parseAudioStreamIdFromTrackXml` | Plex levels API requires Stream id, not ratingKey | Guessing ratingKey as stream id fails at runtime |
| In-memory waveform cache | Avoid refetch when user returns to same track in session | Refetch-only causes visible delay against SC-005 |

## Phase 0 & Phase 1 Artifacts

| Artifact | Status |
|----------|--------|
| [research.md](./research.md) | ✅ Complete |
| [data-model.md](./data-model.md) | ✅ Complete |
| [contracts/waveform-endpoint.md](./contracts/waveform-endpoint.md) | ✅ Complete |
| [contracts/ui-track-waveform.md](./contracts/ui-track-waveform.md) | ✅ Complete |
| [quickstart.md](./quickstart.md) | ✅ Complete |
| Agent context (`.cursor/rules/specify-rules.mdc`) | ✅ Updated to this plan |

## Implementation Notes (for `/speckit-tasks`)

1. **Plex parser**: From track metadata XML, select first `<Stream streamType="2" … id="N">` (audio). Add unit test fixture alongside existing Part key tests.
2. **Levels fetch**: `GET {base}/library/streams/{id}/levels?subsample=256` with `plexMediaHeaders`. Parse JSON `MediaContainer.Level[].v`; min–max normalize to `[0,1]`.
3. **Route**: Register on `libraryRoutes`; 404 when no stream or Plex 404; never return empty `samples`.
4. **TrackWaveform**: Canvas preferred for clip rect played portion; `pointerdown` on click only (not drag seek). Tooltip content = `formatMs(hoverMs)`.
5. **AudioPlayer**: Insert `{trackId && <TrackWaveform … />}` immediately above `<Slider>`; pass `seekDisabled`, `position`, `duration`, `onSeek`.
6. **Regression**: Header `NowPlayingControlPanel` unchanged (FR-008). Queue, gapless, remote cast, restore position — manual quickstart §2–6.
