# Data Model: Plex Music Player (001-plex-music-player)

**Date**: 2026-05-17  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Entities map to spec **Key Entities** and functional requirements. Storage column indicates where each record lives.

---

## Server (PostgreSQL)

### `plex_connections`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| server_url | text | Validated HTTPS/HTTP URL |
| token_encrypted | bytea | AES-GCM blob |
| active_library_ids | text[] | Plex library section IDs |
| last_validated_at | timestamptz | |
| created_at / updated_at | timestamptz | |

**Validation**: URL reachable on save (FR-002); at least one music library selected (FR-003).

---

### `discogs_accounts`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| username | text | |
| token_encrypted | bytea | |
| last_sync_at | timestamptz | nullable |

---

### `discogs_releases` (synced collection)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| discogs_release_id | bigint UNIQUE | |
| title | text | |
| artist | text | |
| year | int | nullable |
| format | text | Vinyl, CD, etc. |
| raw_payload | jsonb | optional full Discogs payload |
| synced_at | timestamptz | |

**Indexes**: `(artist, title)`, GIN on `raw_payload` if needed for search.

---

### `collection_matches`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| discogs_release_id | bigint FK → discogs_releases | |
| plex_rating_key | text | Plex album ratingKey |
| status | enum | `matched`, `partial`, `not_on_plex` |
| confidence | numeric(3,2) | 0–1 |
| manual_override | boolean | FR-037 |
| matched_at | timestamptz | |

**Rules**: Re-match on library refresh or strictness change (FR-038).

---

### `lastfm_accounts`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| session_key_encrypted | bytea | |
| connected | boolean | |
| last_error | text | nullable |

---

### `scrobble_outbox` (server backup of client queue)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| track_title | text | |
| artist | text | |
| album | text | |
| played_at | timestamptz | Original play start (FR-081) |
| retry_count | int | |
| expires_at | timestamptz | played_at + 24h (FR-084) |
| status | enum | `pending`, `submitted`, `dropped` |

---

### `app_settings` (non-credential server prefs)

| Field | Type | Notes |
|-------|------|-------|
| key | text PK | e.g. `matching.strictness`, `library.refresh_policy` |
| value | jsonb | |

---

## Client — `localStorage` keys

| Key | Shape | Maps to |
|-----|-------|---------|
| `dexaudio.theme.mode` | `"sync" \| "light" \| "dark" \| "custom"` | Theme Selection (FR-090–096) |
| `dexaudio.theme.customPresetId` | string | Active Custom preset |
| `dexaudio.playback.autoQueueSimilar` | boolean | FR-013 |
| `dexaudio.playback.crossfade` | `{ enabled, durationSec }` | FR-016 |
| `dexaudio.playback.preCacheLookAhead` | number | FR-020, FR-059 |
| `dexaudio.cache.preCapGb` / `permanentCapGb` | number | FR-018, FR-060 |
| `dexaudio.customPresets` | `CustomThemePreset[]` | max 3 (FR-093) |

**CustomThemePreset**: `{ id, name, colors: { background, surface, primaryText, secondaryText, accent, nowPlayingHighlight } }`

---

## Client — IndexedDB (`dexaudio-cache`)

### Store: `cache_entries`

| Field | Type | Notes |
|-------|------|-------|
| track_rating_key | string PK | Plex track id |
| cache_kind | `"pre-cache" \| "permanent"` | FR-018 |
| version_signal | string | size/hash/mtime from Plex (FR-024) |
| blob | Blob | Audio bytes |
| byte_size | number | |
| last_accessed_at | number | LRU for pre-cache (FR-021) |
| pinned | boolean | Derived from pins |

**Eviction**: Pre-cache LRU within cap; permanent never auto-evicted (FR-023).

### Store: `pending_scrobbles`

| Field | Type | Notes |
|-------|------|-------|
| id | string PK | |
| scrobble | Scrobble | title, artist, album, played_at |
| expires_at | number | epoch ms |

---

## Ephemeral / session (in-memory + optional sessionStorage)

### `PlaybackQueue`

| Field | Type | Notes |
|-------|------|-------|
| items | QueueItem[] | Ordered |
| current_index | number | |

**QueueItem**: `{ track: Track, source: "user" \| "auto" }` — FR-014, FR-015

**State transitions**:
- `Play now` → replace current, strip `source=auto` items, keep user items (FR-014)
- `Add to queue` → append user items
- 1 track remaining + auto-queue on → prefetch similar (FR-013)
- Queue empty + auto off → stop (FR-013)

---

## Plex-sourced domain (not fully persisted; cached)

### `Track`

| Field | Source |
|-------|--------|
| rating_key | Plex |
| title, artist, album | Plex metadata |
| duration_ms | Plex |
| format | `flac` \| `mp3` \| `unsupported` |
| play_count, last_played_at | Plex history (stats) |

### `Album` / `Artist`

Aggregate play counts computed from tracks for Top 10 (FR-040–044).

---

## Relationships (ER overview)

```text
plex_connections 1──* (proxied) MusicLibrary (Plex, ephemeral cache)

discogs_accounts 1──* discogs_releases 1──0..1 collection_matches *──1 Plex Album (rating_key)

lastfm_accounts 1──* scrobble_outbox

PlaybackQueue *──* Track (session)
Pin (track|album|artist) *──* cache_entries (permanent)
```

---

## Validation summary

| Rule | Requirement |
|------|-------------|
| Playable formats | Only FLAC, MP3 (FR-005, FR-006, FR-011) |
| Scrobble eligibility | duration > 30s AND played ≥50% OR ≥4min (FR-081) |
| Pin capacity | Block with prompt if permanent cap exceeded (FR-023) |
| Stale cache | version_signal mismatch → invalidate (FR-024) |
| Custom presets | Min 1 preset always (FR-093) |
