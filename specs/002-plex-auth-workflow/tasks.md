# Tasks: Plex Auth Workflow

**Input**: Design documents from `/specs/002-plex-auth-workflow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration, Plex client constants, shared API schemas

- [x] T001 Add Plex auth columns migration in `backend/drizzle/0008_add_plex_auth_fields.sql`
- [x] T002 Extend `plex_connections` Drizzle schema in `backend/src/db/schema.ts`
- [x] T003 [P] Add `PLEX_CLIENT_ID` and `PLEX_PRODUCT_NAME` constants in `backend/src/lib/config.ts`
- [x] T004 [P] Add Plex auth Zod schemas in `packages/shared-types/src/api/schemas.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend auth orchestration and routes — blocks all user stories

- [x] T005 Add `BadGatewayError` and `UnauthorizedError` in `backend/src/lib/errors.ts`
- [x] T006 Implement plex.tv API client helpers in `backend/src/services/plex/plex-tv-client.ts`
- [x] T007 Implement PIN session and pending auth state in `backend/src/services/plex/plex-auth-service.ts`
- [x] T008 Implement data wipe service in `backend/src/services/plex/data-wipe-service.ts`
- [x] T009 Extend `plex-connection-service.ts` for V2 public shape, account fields, and machine-ID rediscovery
- [x] T010 Create auth REST routes in `backend/src/api/routes/plex-auth.ts` and register in `backend/src/api/routes/index.ts`
- [x] T011 Update `backend/src/api/routes/plex.ts` to return expanded connection response

**Checkpoint**: Auth API endpoints functional via curl (quickstart verification)

---

## Phase 3: User Story 1 - First-time Plex authentication (Priority: P1) 🎯 MVP

**Goal**: PIN-based OAuth onboarding without manual token paste

**Independent Test**: New user clicks "Sign in with Plex", completes browser login, selects server/libraries, lands on main app connected

### Tests for User Story 1

- [x] T012 [P] [US1] Unit tests for PIN parsing and connection selection in `backend/tests/unit/plex-auth-service.test.ts`
- [x] T013 [P] [US1] Integration tests for auth routes in `backend/tests/integration/plex-auth.test.ts`

### Implementation for User Story 1

- [x] T014 [P] [US1] Add shadcn `Dialog` primitive in `frontend/src/components/ui/dialog.tsx`
- [x] T015 [US1] Add auth API methods in `frontend/src/services/api-client.ts`
- [x] T016 [US1] Implement `PlexAuthModal` and step components in `frontend/src/components/plex-auth/`
- [x] T017 [US1] Replace token form with modal flow in `frontend/src/pages/onboarding/PlexSetupPage.tsx`

**Checkpoint**: First-time onboarding works end-to-end

---

## Phase 4: User Story 3 - Modal-based auth workflow (Priority: P1)

**Goal**: Single modal with steps, back navigation, dismiss rules

**Independent Test**: Modal shows step indicator, back works, non-dismissible on onboarding, dismissible from Settings

### Implementation for User Story 3

- [x] T018 [US3] Wire step indicator, back navigation, and dismiss modes in `frontend/src/components/plex-auth/PlexAuthModal.tsx`
- [x] T019 [US3] Handle popup-blocked fallback and PIN timeout/retry in `frontend/src/components/plex-auth/SignInStep.tsx`

**Checkpoint**: Modal UX matches FR-004 through FR-017

---

## Phase 5: User Story 2 - Re-authenticate from Settings (Priority: P2)

**Goal**: Settings re-auth with account switch data wipe

**Independent Test**: Settings shows identity; re-auth updates connection; different account wipes data

### Implementation for User Story 2

- [x] T020 [US2] Replace token UI with re-auth modal in `frontend/src/components/settings/PlexSettingsSection.tsx`
- [x] T021 [US2] Add `clearAllClientData` in `frontend/src/lib/indexed-db.ts` and call on `dataWiped` response
- [x] T022 [P] [US2] Add `AccountWidget` in `frontend/src/components/layout/AccountWidget.tsx` and integrate in `AppShell.tsx`

**Checkpoint**: Re-auth from Settings preserves or wipes data per spec

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T023 [P] Frontend component tests in `frontend/tests/unit/PlexAuthModal.test.tsx`
- [x] T024 Run backend and frontend test suites; fix failures
- [x] T025 Validate quickstart.md curl flow and mark all tasks complete

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 & 4 (modal + onboarding intertwined) → Phase 5 → Phase 6
- US3 modal shell is built with US1 (T016–T019); US2 depends on modal (T016)

## Implementation Strategy

### MVP First

1. Complete Phases 1–2 (backend)
2. Complete Phase 3 + 4 (onboarding + modal)
3. Stop and validate MVP before Settings polish
