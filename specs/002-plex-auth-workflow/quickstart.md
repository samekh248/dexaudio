# Quickstart: Plex Auth Workflow (002-plex-auth-workflow)

**Date**: 2026-05-18
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Prerequisites

Same as the base project (001-plex-music-player):
- Node.js 22.x LTS
- PostgreSQL 16+ (via Docker Compose)
- npm workspaces monorepo already set up

No new environment variables are required. The existing `APP_SECRET` is used for token encryption.

## New Configuration: Plex Client Identity

A consistent Plex client identifier and product name must be configured. These are used in all plex.tv API calls and determine how the application appears in the user's Plex authorized devices list.

Add to `backend/src/lib/config.ts` (or equivalent):

```typescript
export const PLEX_CLIENT_ID = "dex-audio-player";
export const PLEX_PRODUCT_NAME = "Dex Audio";
```

These are application constants, not environment variables, because they must remain stable across all instances and restarts (FR-019).

## Database Migration

### Migration file: `drizzle/0008_add_plex_auth_fields.sql`

```sql
ALTER TABLE plex_connections
  ADD COLUMN IF NOT EXISTS machine_identifier text,
  ADD COLUMN IF NOT EXISTS server_name text,
  ADD COLUMN IF NOT EXISTS account_id text,
  ADD COLUMN IF NOT EXISTS account_username text,
  ADD COLUMN IF NOT EXISTS account_avatar_url text,
  ADD COLUMN IF NOT EXISTS account_email text;
```

Run with:

```bash
cd backend
npx drizzle-kit push
```

Or apply the SQL directly:

```bash
docker exec -i dexaudio-postgres psql -U dexaudio -d dexaudio < drizzle/0008_add_plex_auth_fields.sql
```

## New Backend Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/plex/auth/pin` | Create Plex auth PIN |
| `GET` | `/api/v1/plex/auth/pin/:pinId/status` | Poll PIN authorization status |
| `GET` | `/api/v1/plex/auth/servers` | List available Plex servers |
| `GET` | `/api/v1/plex/auth/servers/:machineId/libraries` | List music libraries on a server |
| `POST` | `/api/v1/plex/auth/complete` | Finalize connection (save server + libraries) |
| `GET` | `/api/v1/plex/account` | Get Plex account identity for UI |

See [contracts/openapi.yaml](./contracts/openapi.yaml) for full request/response schemas.

## Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/api/v1/plex/connection` | Response expanded with `serverName`, `machineIdentifier`, `account` fields |
| `PUT` | `/api/v1/plex/connection` | Deprecated — retained temporarily for backward compat |

## Frontend Changes

| Component | Change |
|-----------|--------|
| `PlexSetupPage` (`pages/onboarding/`) | Remove manual token input; replace with "Sign in with Plex" button that opens auth modal |
| `PlexSettingsSection` (`components/settings/`) | Remove token input; show account identity + "Re-authenticate" button |
| **New**: `PlexAuthModal` (`components/plex-auth/`) | Multi-step modal: sign-in → server selection → library selection |
| **New**: Sidebar/header account widget | Display Plex username + avatar |

## Verification

After applying the migration and implementing the endpoints:

1. **PIN creation**: `curl -X POST http://localhost:3001/api/v1/plex/auth/pin` → should return `{ pinId, pinCode, authUrl }`
2. **PIN polling**: `curl http://localhost:3001/api/v1/plex/auth/pin/{pinId}/status` → should return `{ authorized: false }`
3. **Open authUrl in browser**, sign in, then poll again → should return `{ authorized: true }`
4. **List servers**: `curl http://localhost:3001/api/v1/plex/auth/servers` → should return server list
5. **Complete**: `curl -X POST http://localhost:3001/api/v1/plex/auth/complete -H 'Content-Type: application/json' -d '{"machineIdentifier":"...","libraryIds":["..."]}'`
