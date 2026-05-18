# Research: Plex Auth Workflow (002-plex-auth-workflow)

**Date**: 2026-05-18
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All items resolved; no `NEEDS CLARIFICATION` remains.

---

## 1. Plex PIN-based OAuth flow

**Decision**: Use Plex's PIN/OAuth v2 flow with the backend as the orchestrator (PIN creation, polling, and token receipt all happen server-side). The frontend never handles or sees the raw auth token.

**Flow**:
1. Frontend calls backend `POST /api/v1/plex/auth/pin` → backend creates PIN via `POST https://plex.tv/api/v2/pins` with `strong: true` and the app's client identifier.
2. Backend returns `{ pinId, pinCode, authUrl }` to frontend. The `authUrl` is `https://app.plex.tv/auth#?clientID={clientId}&code={pinCode}&context[device][product]=Dex%20Audio`.
3. Frontend opens `authUrl` in a new browser window/tab.
4. Frontend polls backend `GET /api/v1/plex/auth/pin/{pinId}/status` → backend polls `GET https://plex.tv/api/v2/pins/{pinId}` with the client identifier.
5. When `authToken` is non-null in the Plex response, the backend encrypts and stores it. Returns `{ authorized: true }` to frontend.
6. PIN validity: 30 minutes (Plex-imposed). App-level UI timeout: 3 minutes with option to retry.

**Rationale**: Keeping the token server-side from the moment it's received matches the existing security model (constitution: tokens never in plain client storage). The frontend only needs the PIN code to construct the auth URL.

**Alternatives considered**:
- Frontend-driven PIN flow (frontend creates PIN, polls, then sends token to backend) — rejected because the token would briefly exist in browser memory
- Redirect-based OAuth (no PIN) — Plex does not offer a standard OAuth redirect flow; PIN is the documented mechanism

---

## 2. Plex resources API for server discovery

**Decision**: Use `GET https://plex.tv/api/v2/resources` with the auth token and `Accept: application/json` header to list all devices. Filter to devices where `provides` includes `"server"` and `presence` is `true` (online).

**Response shape** (PlexDevice):
- `name`: Server display name
- `clientIdentifier`: Stable machine identifier (persists across IP/port changes)
- `owned`: Boolean — whether the user owns this server (vs. shared)
- `presence`: Boolean — whether the server is currently online
- `connections[]`: Array of `{ protocol, address, port, uri, local, relay, IPv6 }` — all known addresses for the server
- `accessToken`: Per-server access token scoped to this user+server pair

**Connection selection strategy**: Prefer local non-relay connections first (fastest), then remote non-relay, then relay as last resort. The selected `uri` becomes the stored `serverUrl`.

**Rationale**: The resources API returns per-server access tokens, which are more appropriate for ongoing use than the account-level auth token. Storing the `clientIdentifier` (machine ID) enables address re-discovery if the server's IP changes.

**Alternatives considered**:
- `GET https://plex.tv/servers.xml` — older XML endpoint, returns less connection detail, no per-server tokens
- Manual server URL entry — the current approach; eliminated by this feature

---

## 3. Plex account identity retrieval

**Decision**: Use `GET https://plex.tv/api/v2/user` with the auth token and `Accept: application/json` header. Returns `username`, `email`, `thumb` (avatar URL), and `uuid` (Plex account ID).

**Fields to persist**:
- `username` — display in sidebar/header and Settings
- `thumb` — avatar URL for UI display
- `uuid` — Plex account ID for detecting account switches (FR-022)

**Rationale**: The `/user` endpoint is the standard way to retrieve the authenticated user's profile. The `uuid` field is a stable account identifier ideal for detecting when the user switches accounts.

**Alternatives considered**:
- Parse account info from the PIN response — the PIN response includes some user info but not reliably all fields
- Skip account identity — rejected per clarification (user wants avatar/username visible app-wide)

---

## 4. Architecture: where PIN orchestration lives

**Decision**: All plex.tv API calls (PIN creation, PIN polling, resources fetch, user info fetch) happen on the **backend**. The frontend is a pure UI layer that calls backend REST endpoints.

**New backend endpoints**:
1. `POST /api/v1/plex/auth/pin` — create PIN, return code + auth URL
2. `GET /api/v1/plex/auth/pin/:pinId/status` — poll PIN status
3. `GET /api/v1/plex/auth/servers` — list servers (after auth)
4. `POST /api/v1/plex/auth/complete` — finalize connection (server + libraries)
5. `GET /api/v1/plex/account` — return account identity for UI display

**Rationale**: Centralized on backend keeps secrets server-side, simplifies CORS (plex.tv doesn't set CORS headers for browser requests), and maintains the existing proxy pattern.

**Alternatives considered**:
- Frontend-direct to plex.tv — rejected due to CORS restrictions and token exposure in browser
- Hybrid (frontend creates PIN, backend stores token) — unnecessarily complex; same CORS issue applies

---

## 5. Popup/new-tab handling

**Decision**: Use `window.open()` to open the Plex auth URL. Detect if the popup was blocked by checking if the returned `WindowProxy` is `null` or the `window.closed` property is immediately `true`. If blocked, show the auth URL as a clickable link.

**Rationale**: This is the standard browser approach. No external dependencies needed. The popup blocker detection covers the primary failure mode.

**Alternatives considered**:
- Iframe — rejected; Plex auth page sets `X-Frame-Options: DENY`
- In-app redirect — rejected; user leaves the app context and cannot preserve modal state

---

## 6. Connection resilience (machine identifier fallback)

**Decision**: Store both `serverUrl` (selected connection URI) and `machineIdentifier` (from `clientIdentifier` in resources response) in the `plex_connections` table. On connection failure, call `/api/v2/resources` with the stored token to re-discover the server's current address.

**Fallback flow**:
1. Normal Plex API call fails with network error or timeout
2. Backend calls `plex.tv/api/v2/resources`, finds the device by `clientIdentifier`
3. Selects best connection URI from updated `connections[]`
4. Updates stored `serverUrl`, retries original request
5. If server not found in resources, return auth error to frontend → triggers re-auth modal

**Rationale**: Server addresses change frequently (DHCP, port forwarding changes). The machine identifier is the only stable anchor.

---

## 7. Account/server switch detection and data wipe

**Decision**: Compare the incoming `clientIdentifier` (server) and Plex account `uuid` against the stored values. If either differs, trigger a full data wipe before saving the new connection.

**Wipe scope**:
- PostgreSQL: Clear `discogs_releases`, `collection_matches`, `scrobble_outbox` rows
- Backend: Reset library index metadata
- Frontend: Clear IndexedDB audio caches, clear localStorage library state

**Wipe trigger**: Backend detects mismatch during `POST /api/v1/plex/auth/complete` and performs server-side wipe before saving. Returns a flag in the response so the frontend knows to clear client-side caches.

**Rationale**: Per spec clarification — automatic wipe, no prompt. Simplest and safest approach for a single-user app.

---

## 8. No new dependencies required

**Decision**: No new npm packages needed. All Plex API calls use Node.js built-in `fetch` (Node 22 LTS). Frontend popup handling uses standard browser APIs. The auth modal uses existing shadcn/ui `Dialog`, `Button`, `Stepper`-like patterns (composed from primitives).

**Rationale**: Constitution V (Simplicity & Restraint) — existing tools are sufficient.
