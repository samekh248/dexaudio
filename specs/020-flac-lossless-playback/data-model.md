# Phase 1 Data Model: Lossless FLAC Playback

This feature introduces no database tables. All state is client-side (localStorage preference + in-memory playback state) plus a stateless backend request/response contract. Entities below map to the spec's Key Entities.

## AudioQuality (shared type)

A new shared enum used by the API contract and frontend state.

| Value | Meaning |
|-------|---------|
| `lossless` | Original, unmodified file (FLAC/ALAC) is being delivered/played. |
| `transcoded` | Plex MP3 transcode (current default method) is being delivered/played. |

- Defined in `packages/shared-types/src/api/schemas.ts` as `AudioQualitySchema = z.enum(["lossless", "transcoded"])` with `export type AudioQuality`.
- `StreamQuerySchema = z.object({ quality: z.enum(["auto", "lossless"]).optional() })` validates the stream endpoint query.

## Lossless Playback Preference

The listener's on/off choice, persisted across sessions.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `enabled` | boolean | `true` | Default ON (clarification Q4). |

- **Storage**: `localStorage` key `dexaudio.playback.lossless` (add `StorageKeys.losslessPlayback`), shape `{ enabled: boolean }`, consistent with existing prefs (gapless/crossfade).
- **Accessor**: `frontend/src/lib/lossless-prefs-store.ts` (Zustand) exposing `enabled`, `setEnabled(boolean)`, plus a non-React getter `isLosslessEnabled()` for use in `use-player.ts`, pre-cache, and pin services.
- **Validation**: missing/corrupt value falls back to `{ enabled: true }`.
- **Lifecycle**: changing the value applies to the next track load at the latest; in-progress playback is untouched (FR-012).

## Playback Capability (derived, in-memory)

Whether the current browser can decode a given lossless format. Derived, not stored.

| Field | Type | Notes |
|-------|------|-------|
| `canPlayLossless(format)` | function → boolean | `true` only for `flac`/`alac` the browser can decode (Section 1 of research). |

- Memoized per session; no persistence (deterministic via `canPlayType`).
- Used to gate whether a lossless request is even attempted (FR-009, SC-004).

## Track Playback Quality (in-memory playback state)

The effective delivery quality of the currently loaded track, plus the reason for any fallback. Lives in `use-player.ts` state and is surfaced to the UI.

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| `attemptedMode` | `"lossless" \| "transcoded"` | — | What the current load requested. |
| `effectiveQuality` | `AudioQuality` | `lossless` / `transcoded` | What is actually playing; reflects the response quality header and any downgrade. |
| `fallbackReason` | enum \| null | `unsupported_browser` / `stream_error` / `bandwidth_stall` / `null` | Why a downgrade occurred (null if none). |

### State transitions

```text
                    canPlayLossless && pref.enabled && format∈{flac,alac}
   load(track) ──────────────────────────────────────────────► attempt: lossless
        │                                                              │
        │ (pref off | incapable | other format)                       │ onError(recoverable)  → fallbackReason=stream_error
        ▼                                                              │ stallWindowExceeded   → fallbackReason=bandwidth_stall
   attempt: transcoded ◄───────────────────────────────────────────────┘ (force transcoded, resume at position)
        │
        ▼
   effectiveQuality set from X-Dexaudio-Audio-Quality header (lossless|transcoded)
```

- A downgrade is **per track attempt** and transient: the next `loadTrack` recomputes the decision (FR-008). `losslessFallbackRef` prevents re-attempting lossless for the *same* track within the current playback (no infinite loop — "Repeated fallback" edge case).
- `effectiveQuality` is authoritative from the backend response header so the indicator stays accurate even if the backend served transcoded despite a lossless request (FR-010, US3 scenario 3).

## Relationships

- **Preference** + **Capability** + track `format` → decide **attempted mode** at load time.
- **Backend response header** → sets **effectiveQuality** consumed by the now-playing indicator.
- **Recovery machine** (existing) → on error/stall of a lossless attempt, flips attempted mode to transcoded and reloads with `initialSeekMs` = current position.
