# Implementation Plan: Plex Auth Workflow

**Branch**: `002-plex-auth-workflow` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-plex-auth-workflow/spec.md`

## Summary

Replace the existing manual token-paste Plex onboarding with a **standard PIN-based OAuth flow** (identical to Plexamp/Plex Web), presented within a **multi-step modal dialog**. The backend orchestrates all plex.tv API calls (PIN creation, polling, server discovery, account identity retrieval) so that the raw auth token never reaches the browser. The frontend modal walks the user through sign-in → server selection → library selection in 3 steps, supporting both first-time onboarding and re-authentication from Settings. Connection resilience is improved by storing the server's machine identifier alongside the direct URL for automatic address re-discovery. Account identity (username, avatar) is displayed app-wide in a sidebar/header element and in Settings.

## Technical Context

**Language/Version**: TypeScript 5.x strict on both tiers; React 19.2.x (latest stable); Node.js 22.x LTS; PostgreSQL 16+

**Primary Dependencies**:
- **Frontend**: Vite, React 19, React Router, TanStack Query, shadcn/ui (`Dialog`, `Button`, `RadioGroup`, `Checkbox`, `Spinner`/loading primitives) + Tailwind CSS, Vitest + Testing Library + MSW
- **Backend**: Fastify, Zod validation, Drizzle ORM + `drizzle-kit`, `pg`, Vitest + supertest
- **Shared**: `packages/shared-types` — Zod schemas for new auth endpoints

**Storage**:
- **PostgreSQL**: Extended `plex_connections` table (6 new nullable columns: `machine_identifier`, `server_name`, `account_id`, `account_username`, `account_avatar_url`, `account_email`)
- No new tables. PIN state is ephemeral (in-memory during the auth flow).

**Testing**: Vitest on `frontend/` and `backend/`; 80% coverage target maintained; MSW mocks for plex.tv PIN/resources/user API calls; backend integration tests for auth flow endpoints

**Target Platform**: Modern Chromium/Firefox/Safari desktop browsers; installable PWA; responsive down to 320px

**Project Type**: Web application (frontend + backend + shared types monorepo)

**Performance Goals**: SC-001 — full auth flow under 90 seconds (excluding credential entry); PIN polling at 1–2s intervals

**Constraints**: Single-user operator; auth token never in browser storage; all plex.tv calls proxied through backend (CORS + security); no new npm dependencies

**Scale/Scope**: One operator, one Plex account, one active server connection at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status |
|------|-----------|--------|
| Frontend uses latest stable React + TypeScript strict | I. Technology Stack | ✅ Pass — React 19.2.x, TS strict |
| Backend uses latest stable Node.js LTS + TypeScript strict | I. Technology Stack | ✅ Pass — Node 22 LTS |
| Database is PostgreSQL (no alternative stores introduced) | I. Technology Stack | ✅ Pass — extending existing table only |
| All UI components sourced from shadcn/ui first | II. UI Component Standards | ✅ Pass — modal uses `Dialog`, `Button`, `RadioGroup`, `Checkbox` from shadcn/ui |
| Any custom components justified in Complexity Tracking | II. UI Component Standards | ✅ Pass — step indicator is a simple composed layout, not a custom component |
| Frontend ↔ Backend via RESTful API only (versioned `/api/v1/…`) | III. API Contract | ✅ Pass — 6 new REST endpoints under `/api/v1/plex/auth/*` |
| Shared TypeScript types defined for all API contracts | III. API Contract | ✅ Pass — Zod schemas in `packages/shared-types` |
| Frontend meets WCAG 2.1 AA accessibility requirements | IV. Frontend Quality | ✅ Pass — modal has focus trapping, keyboard nav, ARIA labels on steps |
| Frontend is offline-first PWA with service worker | IV. Frontend Quality | ✅ Pass — auth flow requires network (by nature), but cached/pinned content remains playable during re-auth |
| Responsive layout supports 320 px mobile through desktop | IV. Frontend Quality | ✅ Pass — modal responsive with max-width constraint |
| No new libraries/services added without explicit request | V. Simplicity & Restraint | ✅ Pass — no new dependencies; uses Node 22 built-in `fetch` for plex.tv calls |
| Any new dependencies documented in Complexity Tracking | V. Simplicity & Restraint | ✅ Pass — nothing to document |

**Post-design re-check**: All gates remain ✅. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-plex-auth-workflow/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 — OpenAPI for auth endpoints
│   └── openapi.yaml
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/
└── shared-types/
    └── src/api/schemas.ts          # New Zod schemas for auth endpoints

backend/
├── src/
│   ├── api/routes/
│   │   ├── plex.ts                 # Modified — deprecate PUT /connection
│   │   └── plex-auth.ts            # New — auth flow endpoints
│   ├── services/plex/
│   │   ├── plex-auth-service.ts    # New — PIN creation, polling, server discovery
│   │   ├── plex-connection-service.ts  # Modified — account identity, machine ID
│   │   └── plex-client.ts          # Modified — add plex.tv API helpers
│   ├── db/
│   │   └── schema.ts              # Modified — new columns on plex_connections
│   └── lib/
│       └── config.ts              # Modified — PLEX_CLIENT_ID, PLEX_PRODUCT_NAME
├── drizzle/
│   └── 0008_add_plex_auth_fields.sql  # New migration
└── tests/
    ├── unit/
    │   └── plex-auth-service.test.ts   # New
    └── integration/
        └── plex-auth.test.ts           # New

frontend/
├── src/
│   ├── components/
│   │   ├── plex-auth/
│   │   │   ├── PlexAuthModal.tsx       # New — multi-step auth modal
│   │   │   ├── SignInStep.tsx          # New — step 1: initiate + wait
│   │   │   ├── ServerSelectStep.tsx    # New — step 2: pick server
│   │   │   └── LibrarySelectStep.tsx   # New — step 3: pick libraries
│   │   ├── settings/
│   │   │   └── PlexSettingsSection.tsx # Modified — remove token input, add re-auth
│   │   └── layout/
│   │       └── AccountWidget.tsx       # New — sidebar/header username+avatar
│   ├── pages/onboarding/
│   │   └── PlexSetupPage.tsx           # Modified — "Sign in with Plex" + modal
│   └── services/
│       └── api-client.ts               # Modified — new auth API methods
└── tests/
    └── unit/
        └── PlexAuthModal.test.tsx       # New
```

**Structure Decision**: Extends the existing **web application monorepo** layout. New auth flow logic lives in `plex-auth-service.ts` (backend) and `components/plex-auth/` (frontend). No structural changes to the monorepo.

## Complexity Tracking

No constitution violations. No new dependencies. No custom components outside shadcn/ui primitives.

| Violation / exception | Why Needed | Simpler Alternative Rejected Because |
|----------------------|------------|--------------------------------------|
| *(none)* | — | — |

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | ✅ Complete |
| Data model | [data-model.md](./data-model.md) | ✅ Complete |
| REST contract | [contracts/openapi.yaml](./contracts/openapi.yaml) | ✅ Complete |
| Quickstart | [quickstart.md](./quickstart.md) | ✅ Complete |

## Implementation Phases (high level — detail in tasks.md)

### Phase 2+ (out of scope for `/speckit-plan`)

1. **Database migration**: Add new columns to `plex_connections`; update Drizzle schema
2. **Backend auth service**: plex.tv PIN creation, polling, resources/user API; in-memory PIN state management
3. **Backend auth routes**: 6 new REST endpoints + deprecate old `PUT /connection`
4. **Shared types**: Zod schemas for all auth request/response shapes
5. **Frontend auth modal**: 3-step modal component (`Dialog` + step state machine)
6. **Frontend integration**: Replace `PlexSetupPage` and `PlexSettingsSection`; add `AccountWidget`
7. **Connection resilience**: Machine ID fallback re-discovery on connection failure
8. **Data wipe on account switch**: Detect server/account change, wipe local data
9. **Cleanup**: Remove legacy token-paste UI and deprecated endpoint
10. **Tests**: Backend unit/integration tests for auth flow; frontend component tests for modal

**Next command**: `/speckit-tasks` to generate dependency-ordered `tasks.md`.
