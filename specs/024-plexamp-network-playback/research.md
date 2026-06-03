# Research: Network Plex Music Player Playback

**Feature**: 024-plexamp-network-playback  
**Date**: 2026-06-03

## 1. Discovering Plex music players on the LAN

**Decision**: List players from the connected Plex Media Server via `GET {serverUrl}/clients` (XML `MediaContainer` / `Server` or `Player` devices), filtered to entries that advertise music playback and remote control.

**Rationale**: Matches Plex’s documented client list on the server the user already authenticated to (feature 002). No manual IP entry for v1. `clientIdentifier`, `name`, `product`, `device`, `platform`, and connection `uri` are present on each client for display (FR-012) and command routing.

**Alternatives considered**:

- **plex.tv `/resources` only** — includes servers and some clients but is account-wide and less reliable for LAN-local `uri` than PMS `/clients`.
- **mDNS / SSDP scan** — not in Plex’s model; would duplicate discovery and fail constitution V (new infra).
- **Plexamp-only filter by product string** — rejected per clarification (all music players).

**Filtering rules** (implementation detail for plan/tasks):

- Include clients where `provides` or product indicates a **player** capable of **music**.
- Exclude video-only apps and the DexAudio browser session itself (same `PLEX_CLIENT_ID`).
- Mark unreachable clients (no `uri` or failed probe) as offline in API response but still list if recently seen (optional refresh).

---

## 2. Remote control transport

**Decision**: Backend proxies Plex **Remote Control API** commands to the selected client’s base URI (or server-mediated player endpoints), using the stored Plex token and existing `plexMediaHeaders` / `PLEX_CLIENT_ID` / `PLEX_PRODUCT_NAME`.

**Rationale**: Tokens must not reach the browser (constitution + feature 002). Plex documents commands such as `playback/playMedia`, `playback/pause`, `playback/stop`, `playback/skipNext`, `playback/skipPrevious`, and `playback/seekTo` against `key=/library/metadata/{ratingKey}`.

**Alternatives considered**:

- **Browser → client direct** — exposes token and hits CORS.
- **WebSocket real-time** — constitution forbids without explicit request.
- **Only server playback** — does not satisfy “play on Plexamp instance.”

---

## 3. Queue mirror (replace remote queue)

**Decision**: Use Plex **Play Queues** API on the PMS (`POST /playQueues` with `type=audio` and track URIs, then `PUT` / refresh on queue changes) and command the target client to play that queue. On `playQueues` failure or client rejection, **fallback**: `playMedia` for current track only + enqueue remaining items on each advance (degraded mode with user-visible notice per spec edge case).

**Rationale**: Clarification requires full in-app queue mirror on add/reorder/remove within 5 s. Play Queues is the supported Plex primitive for multi-item audio queues; per-track `playMedia` alone cannot atomically replace order.

**Alternatives considered**:

- **Track-by-track only** — rejected in clarification.
- **Client-local queue only** — not readable reliably from DexAudio for Now Playing sync.

---

## 4. Now Playing bi-directional sync

**Decision**: While a network player is selected, poll `GET /api/v1/plex/players/{clientId}/status` every **3 s** (and on user navigation to Now Playing) to map remote `Media` metadata + `Player` state into the existing queue highlight and transport UI.

**Rationale**: Meets FR-008 (≤5 s) without WebSockets. Pause/skip initiated on the physical Plexamp app updates DexAudio within one poll window.

**Alternatives considered**:

- **Push from Plex** — no supported callback to DexAudio.
- **No bi-directional sync** — fails User Story 3.

---

## 5. Switching output → stop remote

**Decision**: On switch to “This device”, call `playback/stop` on the active client before clearing selection; complete within 2 s (FR-013).

**Rationale**: Matches clarification A. Prevents living-room audio continuing after user expects local-only control.

---

## 6. Plex timeline vs last.fm

**Decision**:

- **Plex timeline (015)**: Gate `plex-playback-reporter` off when `playbackOutput.mode === 'network'` (FR-015).
- **last.fm**: Keep existing `scrobble-tracker` driven by **logical play session** fed from remote status poll (position/duration), not Howler progress (FR-019).

**Rationale**: Clarifications B + A. Avoid duplicate Plex history; last.fm remains outbound from DexAudio independent of which device rendered audio.

---

## 7. Persistence

**Decision**: Store `PlaybackOutputPreference` in `localStorage` (`StorageKeys.playbackOutput`); clear on Plex account/server change alongside existing client data wipe (FR-014).

**Rationale**: No new PostgreSQL tables; preference is per-browser device like other playback prefs (025). Server-side storage adds no user value for v1.

**Alternatives considered**:

- **`app_settings` row** — unnecessary for output picker preference.

---

## 8. Cached tracks + remote output

**Decision**: Remote play always uses Plex library `ratingKey` URIs on the server/player path; **do not** stream cached blobs to the network player. If Plex server unreachable, block remote play and offer “This device” (cached local play) per spec edge case.

**Rationale**: Remote players pull from Plex, not DexAudio IndexedDB.
