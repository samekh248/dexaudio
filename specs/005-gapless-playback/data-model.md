# Data Model: Gapless Playback

## Overview

No PostgreSQL schema changes. This feature extends **client-side persistence**, **IndexedDB cache policy**, and **in-memory player staging state**.

---

### 1. GaplessPlaybackPreference (`localStorage`)

| Field | Type | Default | Storage key |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | `dexaudio.playback.gapless` |

**Validation**: Coerced boolean on read; invalid JSON falls back to `false`.

**Relationships**: When `enabled === true`, effective pre-cache forward depth is `max(userPreCacheLookAhead, 2)` and bidirectional neighbor policy is active.

---

### 2. PlaybackSettings (client aggregate — extended)

Extends the implicit settings object managed in `PlaybackSettingsSection` and read by player/cache modules.

| Field | Type | Source key | Notes |
|-------|------|------------|-------|
| `gaplessEnabled` | `boolean` | `StorageKeys.gaplessPlayback` | New |
| `crossfade` | `{ enabled: boolean; durationSec: number }` | `StorageKeys.crossfade` | Mutually exclusive with gapless |
| `preCacheLookAhead` | `number` (1–10) | `StorageKeys.preCacheLookAhead` | User setting; effective min 2 when gapless on |
| `autoQueueSimilar` | `boolean` | `StorageKeys.autoQueueSimilar` | Unchanged |

**Invariant**: `gaplessEnabled && crossfade.enabled` MUST NOT both be true (enforced at write time in Settings UI).

---

### 3. GaplessCacheSlot (logical — not persisted)

Represents one neighbor in the four-slot priority window relative to `currentIndex`.

| Field | Type | Description |
|-------|------|-------------|
| `priority` | `1 \| 2 \| 3 \| 4` | 1=next, 2=previous, 3=second-ahead, 4=two-behind |
| `queueIndex` | `number` | Index into `PlaybackQueue.items` |
| `trackId` | `string` | Plex rating key |
| `status` | `pending \| fetching \| ready \| failed` | In-memory worker state |

**Lifecycle**: Recomputed on `currentIndex` or queue mutation; in-flight fetches for abandoned slots cancelled via generation token (same pattern as `loadIdRef` in `use-player.ts`).

---

### 4. StagedHowl (in-memory — `use-player.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `trackId` | `string` | Track the staged instance was built for |
| `howl` | `Howl` | Preloaded instance (`state === 'loaded'`) |
| `blobUrl` | `string` | Object URL to revoke on teardown |
| `direction` | `forward \| backward` | Whether this stages next or previous neighbor |

**Lifecycle**:

```text
[current playing] ──preload──▶ staged (loaded, silent)
        │ onend / gapless Next / gapless Previous
        ▼
[staged promoted to active] ──async──▶ old instance unloaded
```

If promotion fails → `loadTrack` fallback (silent degrade).

---

### 5. CacheEntry (existing IndexedDB — behavior extension)

No schema migration. Existing fields: `track_rating_key`, `cache_kind`, `version_signal`, `blob`, `byte_size`, `last_accessed_at`, `pinned`.

**New behavior**:

- `protectedKeys` set passed into eviction helper when writing gapless slots.
- Entries with `cache_kind === "permanent"` or `pinned === true` never evicted for gapless (unchanged).

---

### 6. Queue state (existing `playback-queue-store` — read-only)

Gapless reads `items[]` and `currentIndex` but does not add fields. `loadGeneration` increments still cancel stale player/cache work.

---

## State Transitions

### Gapless setting toggle

| Event | Current track | Next transition |
|-------|---------------|-----------------|
| Enable gapless | Keeps playing | Gapless rules apply |
| Disable gapless | Keeps playing | Pre-gapless behavior |
| Enable crossfade while gapless on | Keeps playing | Gapless forced off + toast |

### Track transition (gapless enabled)

| Condition | Action |
|-----------|--------|
| Forward staged Howl ready | Promote staged → play immediately |
| Forward staged not ready | `loadTrack(next)` (degrade) |
| Backward target in cache + staged ready | Promote prev staged |
| Backward not ready | `loadTrack(prev)` or `setIndex` + load (degrade) |
| Hard load error | Existing song-playback error flows |
