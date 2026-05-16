<!-- SYNC IMPACT REPORT
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A (initial authoring from template)
Added sections:
  - I. Technology Stack & Version Policy
  - II. UI Component Standards
  - III. API Contract
  - IV. Frontend Quality Standards
  - V. Simplicity & Restraint
  - Technology Stack Reference
  - Development Workflow
  - Governance
Templates reviewed:
  - .specify/templates/plan-template.md ✅ (Constitution Check gate references this file)
  - .specify/templates/spec-template.md ✅ (no constitutional conflicts)
  - .specify/templates/tasks-template.md ✅ (web-app path conventions align with stack)
  - .specify/templates/constitution-template.md ✅ (source template)
Deferred TODOs: none
-->

# Dexaudio Constitution

## Core Principles

### I. Technology Stack & Version Policy

The project MUST use the following technology stack at their latest stable releases. Any
upgrade to a new major version requires explicit confirmation in the relevant feature spec
before implementation begins.

- **Frontend**: React (latest stable) with TypeScript (strict mode).
- **Backend**: Node.js (latest stable LTS) with TypeScript (strict mode).
- **Database**: PostgreSQL is the sole primary relational data store.
- All three layers MUST remain on their latest stable versions; no pinning to outdated
  releases unless a specific, documented compatibility blocker exists.

**Rationale**: Staying on latest stable ensures access to security patches, performance
improvements, and ecosystem tooling. TypeScript strict mode eliminates entire categories
of runtime errors at compile time.

### II. UI Component Standards

The frontend MUST source all primary UI components from the latest stable release of
shadcn/ui before writing any custom component implementations.

- Components MUST be added via the shadcn/ui CLI and kept un-ejected where possible.
- Custom components are permitted only when shadcn/ui has no equivalent; this MUST be
  documented in the relevant plan.md under Complexity Tracking.
- Styling MUST use Tailwind CSS (bundled with shadcn/ui) as the primary styling mechanism;
  no additional CSS-in-JS libraries unless explicitly requested.

**Rationale**: A single, well-maintained component library reduces visual inconsistency,
accelerates development, and keeps the dependency surface minimal.

### III. API Contract

The frontend MUST communicate with the backend exclusively through RESTful HTTP API
endpoints. No direct database access, no GraphQL layer, and no real-time socket protocols
may be introduced without an explicit request.

- All API endpoints MUST be versioned (e.g., `/api/v1/…`).
- Request/response shapes MUST be defined as TypeScript types shared between frontend and
  backend (e.g., via a shared `types/` package or co-located contract files).
- Endpoints MUST follow REST conventions: noun-based resource paths, standard HTTP verbs,
  and appropriate status codes.

**Rationale**: RESTful APIs are widely understood, easily cacheable, and straightforward
to test independently. A clear boundary between frontend and backend enables parallel
development and independent deployment.

### IV. Frontend Quality Standards

Every frontend feature MUST meet all four quality dimensions before it is considered
complete. These are non-negotiable and apply to every user-facing change.

1. **Accessibility**: MUST conform to WCAG 2.1 Level AA. Semantic HTML, keyboard
   navigability, ARIA attributes where necessary, and sufficient color contrast are
   required on all interactive elements.
2. **Offline-First / PWA**: The frontend MUST be a Progressive Web App. Core user
   journeys MUST remain functional without a network connection using service worker
   caching strategies (cache-first for static assets, stale-while-revalidate for API
   data where appropriate).
3. **Responsive Design**: Layouts MUST be functional and usable at all viewport widths
   from 320 px (mobile) through desktop. No feature may ship that breaks at any standard
   breakpoint.
4. **Installability**: The app MUST include a valid Web App Manifest so it can be
   installed to home screen on mobile and desktop.

**Rationale**: These properties expand the app's reach to all users regardless of device,
network reliability, or accessibility needs.

### V. Simplicity & Restraint

No new library, framework, service, or technology may be introduced into the project
unless explicitly requested by the user for that feature.

- When an existing dependency already covers the need, it MUST be used.
- When a new dependency is unavoidable and has been requested, its addition MUST be
  documented in plan.md under Complexity Tracking with justification.
- YAGNI (You Aren't Gonna Need It) is the default posture for all implementation
  decisions.

**Rationale**: Every additional dependency is maintenance debt, an attack surface, and a
source of version conflicts. Restraint keeps the project navigable and auditable.

## Technology Stack Reference

| Layer | Technology | Language | Notes |
|-------|-----------|----------|-------|
| Frontend | React (latest stable) | TypeScript (strict) | shadcn/ui components, Tailwind CSS |
| Backend | Node.js (latest stable LTS) | TypeScript (strict) | RESTful API only |
| Database | PostgreSQL (latest stable) | SQL | Primary relational store |
| UI Components | shadcn/ui (latest stable) | — | Tailwind CSS styling |
| PWA | Service Worker + Web App Manifest | — | Offline-first required |

## Development Workflow

- Feature branches MUST follow the naming convention enforced by `speckit.git.feature`
  before any specification work begins.
- All PRs MUST pass a Constitution Check (verified against this document) before merging.
- The Constitution Check in plan.md MUST explicitly confirm compliance with Principles I–V
  before Phase 0 research proceeds.
- Any deviation from these principles requires a constitution amendment (see Governance)
  before implementation, not after.

## Governance

This constitution supersedes all other project practices and preferences. It represents
the non-negotiable baseline for all engineering decisions on this project.

**Amendment procedure**:

1. Propose the change as a user request referencing the specific principle to amend.
2. Run `/speckit-constitution` with the updated guidance; the version MUST be incremented.
3. Propagate changes to all dependent templates per the consistency checklist.
4. Commit the updated constitution with message format:
   `docs: amend constitution to vX.Y.Z (<brief rationale>)`

**Versioning policy**:
- MAJOR: Removal or fundamental redefinition of a principle.
- MINOR: New principle or section added; material expansion of existing guidance.
- PATCH: Clarifications, wording, or typo fixes with no semantic change.

**Compliance review**: Every `speckit-plan` Constitution Check gate enforces compliance.
Any implementation that would violate a principle MUST trigger an amendment first.

**Version**: 1.0.0 | **Ratified**: 2026-05-16 | **Last Amended**: 2026-05-16
