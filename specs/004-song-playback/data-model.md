# Data Model: Song Playback

## Entity Changes

This feature primarily modifies **frontend state models** and **shared type definitions**. No new database tables are required.

---

### 1. TrackFormat (extended enum — `packages/shared-types`)

**Current**: `"flac" | "mp3" | "unsupported"`

**New**: `"flac" | "mp3" | "aac" | "ogg" | "wav" | "alac" | "wma" | "unsupported"`

| Value | Browser-Native | Plex Transcode Fallback | Source Codec Strings |
|-------|---------------|------------------------|---------------------|
| `flac` | Yes | — | `flac` |
| `mp3` | Yes | — | `mp3` |
| `aac` | Yes | — | `aac`, `m4a` |
| `ogg` | Yes | — | `ogg`, `opus`, `vorbis` |
| `wav` | No | Yes → MP3 320kbps | `wav`, `wave` |
| `alac` | No | Yes → MP3 320kbps | `alac` |
| `wma` | No | Yes → MP3 320kbps | `wma`, `wmav2` |
| `unsupported` | No | Attempted → error if fails | *(anything else)* |

**Validation**: Zod enum, same pattern as existing `TrackFormatSchema`.

---

### 2. PlaybackErrorCategory (new enum — `packages/shared-types`)

Classifies playback failures for UI rendering and logging.

| Value | Description | UI Treatment | Affordances |
|-------|-------------|-------------|-------------|
| `unsupported_format` | Codec not decodable by browser or Plex transcode | Toast (auto-skip) | Skip |
| `server_unreachable` | Plex server offline or wrong URL | Inline banner (blocking) | Retry |
| `auth_expired` | Plex token expired or revoked | Inline banner (blocking) | Sign in |
| `track_not_found` | Track removed/moved on Plex server | Toast (auto-skip) | Skip |
| `network_interrupted` | Connection lost mid-stream | Inline banner (blocking) | Retry |
| `autoplay_blocked` | Browser blocked autoplay (no gesture) | Inline banner (blocking) | Play (gesture) |
| `unknown` | Unclassifiable error | Toast (auto-skip) | Skip, See details |

**Classification**: Whether an error is "individual track" (toast, auto-skip) or "session-level" (banner, blocking) is determined by the category:
- **Individual**: `unsupported_format`, `track_not_found`, `unknown`
- **Session-level**: `server_unreachable`, `auth_expired`, `network_interrupted`, `autoplay_blocked`

---

### 3. PlaybackFailure (new type — `packages/shared-types`)

Represents a single playback failure event.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | `PlaybackErrorCategory` | Yes | Error classification |
| `message` | `string` | Yes | User-comprehensible summary |
| `trackTitle` | `string` | No | Title of the affected track |
| `trackArtist` | `string` | No | Artist of the affected track |
| `trackId` | `string` | No | Server-side track identifier |
| `technicalDetail` | `string` | No | Reason code + server-provided detail for "See details" |
| `affordances` | `PlaybackAffordance[]` | Yes | Available next-step actions |
| `timestamp` | `string` (ISO 8601) | Yes | When the failure occurred |

---

### 4. PlaybackAffordance (new enum — `packages/shared-types`)

| Value | Label | Action |
|-------|-------|--------|
| `skip` | "Skip" | Advance to next queue item |
| `retry` | "Retry" | Re-attempt the same track |
| `sign_in` | "Sign in" | Navigate to Plex auth settings |
| `back_to_library` | "Back to library" | Navigate to albums home |
| `retry_queue` | "Retry queue" | Reset queue index to 0 and restart |
| `play_gesture` | "Play" | Satisfy autoplay gesture requirement |

---

### 5. PlaybackState (frontend-only — Zustand or hook state)

Extended state managed by `usePlayer` hook. Not persisted to database.

| Field | Type | Current | New | Notes |
|-------|------|---------|-----|-------|
| `playing` | `boolean` | ✅ | ✅ | |
| `position` | `number` (ms) | ✅ | ✅ | |
| `duration` | `number` (ms) | ✅ | ✅ | |
| `volume` | `number` (0–1) | ✅ | ✅ | Now persisted to localStorage |
| `fromCache` | `boolean` | ✅ | ✅ | |
| `error` | `PlaybackFailure \| null` | ❌ | ✅ | Current playback error, if any |
| `autoplayBlocked` | `boolean` | ❌ | ✅ | True when browser blocks autoplay |
| `loading` | `boolean` | ❌ | ✅ | True while fetching/decoding a track |

---

### 6. QueueState (extended — `playback-queue-store.ts`)

| Field | Type | Current | New | Notes |
|-------|------|---------|-----|-------|
| `items` | `QueueItem[]` | ✅ | ✅ | |
| `currentIndex` | `number` | ✅ | ✅ | |
| `skippedIndices` | `Set<number>` | ❌ | ✅ | Tracks indices that were auto-skipped due to errors |

The `skippedIndices` set allows the system to detect the "all tracks failed" terminal state: when `skippedIndices.size + 1 >= items.length` (all items either skipped or currently failing), show the terminal "no tracks could be played" message.

---

## Relationships

```
QueueItem (1) ──── has ──── (1) Track
     │
     │ currentIndex points to
     ▼
PlaybackState ──── may have ──── (0..1) PlaybackFailure
     │                                      │
     │                                      ├── category: PlaybackErrorCategory
     │                                      └── affordances: PlaybackAffordance[]
     │
     └── volume persisted to localStorage
```

## State Transitions

```
[Idle] ──play──▶ [Loading] ──success──▶ [Playing]
                    │                      │
                    │                      ├──pause──▶ [Paused] ──play──▶ [Playing]
                    │                      │
                    │                      ├──end──▶ [Loading] (next track)
                    │                      │
                    │                      └──error──▶ [Error]
                    │
                    ├──autoplay-blocked──▶ [AutoplayBlocked] ──gesture──▶ [Playing]
                    │
                    └──error──▶ [Error]
                                  │
                                  ├── individual track error ──auto-skip──▶ [Loading] (next track) + toast
                                  │
                                  └── session error ──▶ [Blocked] (inline banner, awaiting user action)
                                                          │
                                                          ├──retry──▶ [Loading]
                                                          ├──sign-in──▶ navigate to settings
                                                          └──back-to-library──▶ navigate to /
```

## No Database Changes

This feature does not introduce any new database tables or modify existing ones. All new state is either:
- **Shared types** in `packages/shared-types` (TypeScript types/Zod schemas)
- **Frontend state** in React hooks and Zustand stores
- **Browser storage** via `localStorage` (volume only)
