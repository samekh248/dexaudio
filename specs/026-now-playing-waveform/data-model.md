# Data Model: Now Playing Waveform

**Feature**: 026-now-playing-waveform  
**Date**: 2026-06-04

## Overview

Waveform data is **read-only**, sourced from Plex loudness analysis, proxied through Dexaudio, and consumed by the Now Playing UI. No PostgreSQL entities. Optional in-memory client cache only.

## Entities

### TrackWaveform (API / shared-types)

Normalized loudness samples for one track, suitable for bar rendering.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackId` | string | yes | Plex rating key (same as `Track.id`) |
| `samples` | number[] | yes | Normalized amplitudes 0–1, left→right in time order |
| `sampleIntervalMs` | number (int) | yes | Milliseconds per sample (typically 100) |
| `durationMs` | number (int) | yes | Track duration used for seek mapping (from metadata) |

**Validation rules**:

- `samples.length >= 1`
- `sampleIntervalMs > 0`
- `durationMs >= 0`
- Each sample in `[0, 1]` after server normalization

**Source**: Backend maps Plex `Level[].v` (dB) → normalized heights; passes through `durationMs` from track metadata.

### TrackStreamContext (backend extension)

Existing Plex fetch context; additive field:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `track` | Track \| null | yes | Unchanged |
| `partKey` | string | optional | Unchanged |
| `audioStreamId` | string | optional | Plex `<Stream streamType="2" id="…">` for `/library/streams/{id}/levels` |

### WaveformUiState (frontend hook)

Client-side state machine for one mounted Now Playing surface.

| State | `status` | `waveform` | UI |
|-------|----------|------------|-----|
| Idle | `idle` | null | No waveform |
| Loading | `loading` | null | No waveform (FR-009) |
| Ready | `ready` | TrackWaveform | Render bars |
| Unavailable | `unavailable` | null | No waveform (404 / no stream id) |
| Error | `error` | null | No waveform; log only (no user-facing error) |

**Transitions**:

```text
idle --(trackId set)--> loading
loading --(200 + samples)--> ready
loading --(404 | no audioStreamId)--> unavailable
loading --(network/5xx)--> error
ready/unavailable/error --(trackId change)--> loading
```

### Playback position coupling (not persisted)

| Field | Source | Use |
|-------|--------|-----|
| `positionMs` | `usePlayer().position` / restore phase | Played/unplayed split index |
| `durationMs` | `player.duration \|\| track.durationMs` | Click hover time + clamp seek |
| `seekDisabled` | `player.networkMode && !player.remoteSupportsSeek` | Disables FR-006 / FR-012 |

**Seek mapping** (click):

```text
ratio = clamp(clickX / waveformWidth, 0, 1)
targetMs = round(ratio * durationMs)
```

Drag on waveform: ignored (clarification).

## Relationships

```text
Track (queue) 1──0..1── TrackWaveform (per fetch, cacheable)
TrackStreamContext 1──0..1── audioStreamId ──► Plex /library/streams/{id}/levels
```

## Out of scope (data)

- Persisting waveforms to IndexedDB
- Waveform on header `NowPlayingControlPanel`
- GraphQL exposure
