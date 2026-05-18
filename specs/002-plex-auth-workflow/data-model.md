# Data Model: Plex Auth Workflow (002-plex-auth-workflow)

**Date**: 2026-05-18
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

This feature modifies the existing `plex_connections` table and introduces no new tables.

### Modified: `plex_connections`

Existing columns retained; new columns added to support machine identifier, account identity, and account-switch detection.

| Column | Type | Nullable | Default | Change | Purpose |
|--------|------|----------|---------|--------|---------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Existing | Primary key |
| `server_url` | `text` | NOT NULL | — | Existing | Selected server connection URI |
| `token_encrypted` | `bytea` | NOT NULL | — | Existing | AES-encrypted Plex auth token (now per-server token from resources API) |
| `active_library_ids` | `text[]` | NOT NULL | `'{}'` | Existing | Selected music library section IDs |
| `machine_identifier` | `text` | NULL | — | **New** | Plex server `clientIdentifier` from resources API; stable across IP/port changes; used for address re-discovery (FR-023) and account-switch detection (FR-022) |
| `server_name` | `text` | NULL | — | **New** | Display name of the Plex server (from resources API `name` field) |
| `account_id` | `text` | NULL | — | **New** | Plex account `uuid` from `/api/v2/user`; used to detect account switches (FR-022) |
| `account_username` | `text` | NULL | — | **New** | Plex account display name (FR-024, FR-025) |
| `account_avatar_url` | `text` | NULL | — | **New** | Plex account avatar thumbnail URL (FR-024, FR-025) |
| `account_email` | `text` | NULL | — | **New** | Plex account email address (FR-024) |
| `last_validated_at` | `timestamptz` | NULL | — | Existing | Last successful connection validation |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Existing | Row creation time |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Existing | Last update time |

### Migration

```sql
ALTER TABLE plex_connections
  ADD COLUMN machine_identifier text,
  ADD COLUMN server_name text,
  ADD COLUMN account_id text,
  ADD COLUMN account_username text,
  ADD COLUMN account_avatar_url text,
  ADD COLUMN account_email text;
```

All new columns are nullable to maintain backward compatibility with existing rows created by the legacy token-paste flow. After the auth workflow migration, new connections will always populate these fields.

### No new tables

- The Plex PIN is ephemeral (lives only in backend memory during the auth flow; never persisted to the database).
- Server resources are fetched on-demand from plex.tv, not cached in the database.

## Entity Relationships

```text
PlexConnection (plex_connections)
  ├── identifies server by: machine_identifier
  ├── identifies account by: account_id
  └── references libraries by: active_library_ids[]
```

No foreign key relationships — `active_library_ids` are opaque Plex section IDs stored as an array. The single-user design means at most one active `plex_connections` row exists at any time.

## State Transitions

### Plex Connection Lifecycle

```text
[No Connection] ─── onboarding auth ──→ [Connected]
                                              │
                      ┌───────────────────────┤
                      │                       │
              re-auth (same server)   re-auth (different server/account)
                      │                       │
                      ▼                       ▼
               [Connected]           [Data Wipe] → [Connected]
                      │                             (fresh state)
                      │
              token expires / auth error
                      │
                      ▼
               [Auth Required] ── re-auth modal ──→ [Connected]
```

### PIN Flow (ephemeral, in-memory only)

```text
[Created] ── polling ──→ [Authorized] ──→ (token stored, PIN discarded)
    │                         
    └── timeout (30min) ──→ [Expired] ──→ (discarded, user retries)
```

## Indexes

No additional indexes required beyond the existing primary key. The table contains at most one row (single-user design).

## Data Validation Rules

- `server_url`: Must be a valid URL (validated at application layer via Zod)
- `machine_identifier`: Alphanumeric string (Plex format: 40-character hex); validated on save
- `account_id`: Plex UUID format; validated on save
- `account_avatar_url`: Valid URL or null
- `token_encrypted`: Non-empty bytea; encrypted with `APP_SECRET` using existing `lib/crypto.ts`
