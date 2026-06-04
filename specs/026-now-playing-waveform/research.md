# Research: Now Playing Waveform

**Feature**: 026-now-playing-waveform  
**Date**: 2026-06-04

## 1. Plex waveform / loudness data source

**Decision**: Fetch per-track loudness levels from Plex PMS `GET /library/streams/{streamId}/levels` (JSON), with optional `subsample` to cap bar count for UI width.

**Rationale**:

- Plexamp-style waveform seeking uses **loudness analysis** stored by the server (not a public PNG asset). The Luke Hagar Plex API spec documents:
  - `GET /library/streams/{streamId}/levels` — JSON `Level[]` with `v` (dB) per ~100ms, plus `totalSamples`
  - `GET /library/streams/{streamId}/loudness` — plain-text lines (same cadence)
- JSON `/levels` is easier to parse and validate than newline loudness text.
- `subsample` reduces payload and matches display resolution (~200–400 bars).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Pre-rendered waveform image URL | Not documented on PMS; Plex Web may composite client-side from levels |
| Client-side audio decode + peaks | Violates simplicity; large downloads; duplicates server analysis |
| `/library/metadata/{id}/file` + Web Audio | Same as above; slow and heavy on mobile |
| Always show placeholder | Violates FR-002 / clarifications (no skeleton) |

**Availability**: Plex returns **404** when loudness analysis is missing or not yet run for that stream. Dexaudio treats 404 as “no waveform” (hide UI, no error banner).

## 2. Resolving `streamId` from a track

**Decision**: Parse the primary **audio** `<Stream streamType="2" id="…">` from track metadata XML (same fetch as `fetchTrackStreamContext`). Extend `TrackStreamContext` with optional `audioStreamId: string | undefined`.

**Rationale**: The levels endpoint keys off Plex **Stream** id, not `ratingKey`. Metadata XML already loaded for streaming; one extra regex parse is cheap.

**Alternatives considered**:

- Separate metadata round-trip — redundant with existing context fetch.
- Use `Part id` — incorrect per API spec (path is `/library/streams/{streamId}`).

## 3. Backend proxy shape

**Decision**: Add versioned REST endpoint `GET /api/v1/library/tracks/:trackId/waveform` returning normalized JSON (`TrackWaveform` in `shared-types`). Backend proxies Plex with stored token (same pattern as `/plex/photo` and `/stream/:trackId`).

**Rationale**: Constitution III requires frontend ↔ backend via REST; avoids exposing Plex token to the browser and centralizes 401/404 handling.

**Alternatives considered**:

- Frontend calls Plex directly — exposes token and CORS issues.

## 4. Frontend rendering & interaction

**Decision**: New `TrackWaveform` component (canvas or inline SVG bars, no new npm deps):

- Height ~64px (medium band per clarifications); width 100% aligned with shadcn `Slider`.
- Played segment: `hsl(var(--now-playing-highlight))` or theme accent; unplayed: `hsl(var(--muted-foreground) / 0.35)`.
- `aria-hidden="true"` on waveform container; progress `Slider` unchanged (FR-010).
- **Click** maps x → `durationMs` → `onSeek(ms)`; **no drag scrub** on waveform (pointer capture disabled / ignore `pointermove` seek).
- **Hover** (pointer fine): Radix/shadcn `Tooltip` or lightweight positioned label with `formatMs(target)`.
- `seekDisabled` from player (remote cast) disables click, hover preview, and pointer cursor.

**Rationale**: Matches all clarification answers; reuses existing `AudioPlayer` seek pipeline; theme tokens already used elsewhere (`theme-engine.ts`).

**Alternatives considered**:

- Third-party waveform library (wavesurfer.js) — new dependency; violates Principle V without user request.
- shadcn component — no waveform primitive.

## 5. Loading & lifecycle

**Decision**: `useTrackWaveform(trackId)` hook — idle until `trackId` set; fetch on change; **no UI until `status === 'ready'`**; abort in-flight on track change; in-memory cache `Map<trackId, TrackWaveform>` for queue revisits.

**Rationale**: FR-009, SC-003 (no layout shift / skeleton). SC-005 satisfied by clearing state immediately on `trackId` change before new fetch completes.

## 6. Sample normalization for display

**Decision**: Map raw dB levels to 0–1 bar heights via min–max normalize per track (floor at min level, cap at max). Store `sampleIntervalMs: 100` from Plex cadence unless `totalSamples` + `durationMs` imply different spacing.

**Rationale**: Absolute dB values vary by mastering; relative shape is what users recognize (Plexamp-style).

## 7. Performance

**Decision**: Default `subsample=256` query param; target fetch < 500ms p95 on LAN; render on `requestAnimationFrame` only when position changes > 1s boundary or on seek (avoid 60fps full redraw).

**Rationale**: Meets SC-002 sync without jank; small JSON payload.
