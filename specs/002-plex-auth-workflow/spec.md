# Feature Specification: Plex Auth Workflow

**Feature Branch**: `002-plex-auth-workflow`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "As a user, I want to be able to authenticate with my Plex server via the standard Plexamp auth workflow, which requires browser login, selecting libraries, etc. The workflow should run within a modal."

## Clarifications

### Session 2026-05-18

- Q: When a user re-authenticates and connects to a different Plex server or Plex account, what should happen to existing cached audio, library index, Discogs matches, and pending scrobbles? → A: Automatically wipe all local data (caches, library index, Discogs matches) and start fresh with the new server/account.
- Q: Should the app store just the server URL (current behavior) or also the server's machine identifier for address re-discovery if the URL changes? → A: Store both — use the direct URL normally, fall back to re-resolving via the machine identifier through Plex's resources API if the URL fails.
- Q: After auth, should the app display the user's Plex account identity (username, avatar) in the UI? → A: Show in Settings > Plex and in a persistent sidebar/header element — username and/or avatar visible app-wide as a subtle identity indicator.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-time Plex authentication (Priority: P1)

As a new user launching the application for the first time, I want to sign into my Plex account through the same browser-based login flow used by Plexamp, so that I can securely connect to my Plex server without needing to manually find and paste an authentication token.

**Why this priority**: Without authentication, the entire application is non-functional. The auth flow is the gateway to all other features. Replacing the manual token-paste approach with the standard Plex OAuth (PIN-based) workflow removes friction and aligns with what Plex users expect from first-party-quality applications.

**Independent Test**: A user can open the application, click "Sign in with Plex", complete the browser-based login at plex.tv, return to the application, see their available servers and libraries, select them, and land on the main application screen with a working Plex connection — all without ever seeing or handling a raw token.

**Acceptance Scenarios**:

1. **Given** the application has no saved Plex connection, **When** the user opens the application, **Then** the onboarding screen presents a "Sign in with Plex" button as the primary call to action.
2. **Given** the user clicks "Sign in with Plex", **When** the auth modal opens, **Then** a new browser window (or tab) opens to the official Plex sign-in page at `app.plex.tv/auth`, pre-populated with the application's client identifier and PIN code.
3. **Given** the Plex sign-in page is open, **When** the user successfully logs into their Plex account and authorizes the application, **Then** the auth modal detects the completed authorization (via PIN polling), closes or hides the waiting state, and advances to the next step.
4. **Given** the user has authorized the application, **When** the modal advances, **Then** it displays a list of the user's available Plex servers (sourced from the user's Plex account resources) and prompts the user to select one.
5. **Given** the user selects a Plex server, **When** the modal advances, **Then** it displays the music libraries available on that server and prompts the user to select one or more.
6. **Given** the user selects at least one music library, **When** the user confirms, **Then** the application saves the connection (server URL, encrypted auth token, selected library IDs), closes the modal, and begins loading the music library.
7. **Given** the Plex sign-in browser window is open but the user closes it without authorizing, **When** the modal's polling detects no authorization within a reasonable timeout (e.g., 3 minutes), **Then** the modal shows a "Sign in was not completed" message with an option to retry or cancel.
8. **Given** plex.tv is unreachable during the PIN request, **When** the user clicks "Sign in with Plex", **Then** the modal displays an error message indicating that Plex's authentication service is unavailable, with a "Try Again" option.
9. **Given** the user is on the server selection step, **When** no servers are found on the account, **Then** the modal shows a helpful message explaining that no Plex servers were found and suggests checking that the Plex Media Server is running and claimed to the account.

---

### User Story 2 - Re-authenticate or change Plex account from Settings (Priority: P2)

As a user who has already connected a Plex account, I want to re-authenticate (for example, after a token expires or to switch Plex accounts) from the Settings area, so that I can maintain or change my connection without reinstalling or clearing app data.

**Why this priority**: Token expiration and account switching are inevitable for long-term users. Without re-auth, users would be stranded when their token expires.

**Independent Test**: A user navigates to Settings > Plex, clicks "Re-authenticate" or "Change Account", completes the same OAuth modal flow, and the application reconnects with the new credentials.

**Acceptance Scenarios**:

1. **Given** the user has an active Plex connection, **When** the user navigates to Settings > Plex, **Then** the connection status is displayed (server name, connection health, Plex username, and avatar) alongside a "Re-authenticate" or "Sign in with a different account" action.
2. **Given** the user clicks "Re-authenticate", **When** the auth modal opens, **Then** the same full OAuth flow (PIN request → browser sign-in → server selection → library selection) is presented.
3. **Given** the user completes re-authentication with the same server, **When** the modal closes, **Then** the application updates the stored token and any changed library selections, and refreshes the library.
4. **Given** the user completes re-authentication with a different Plex server or account, **When** the modal closes, **Then** the application wipes all local data (audio caches, library index, Discogs collection matches, pending scrobbles) and starts fresh with the new connection.
5. **Given** the user cancels mid-flow during re-authentication, **When** the modal is dismissed, **Then** the existing connection remains unchanged and no data is lost.

---

### User Story 3 - Modal-based auth workflow experience (Priority: P1)

As a user, I want the entire Plex authentication flow (sign-in initiation, waiting for browser auth, server selection, library selection) to be contained within a single modal dialog, so that the experience feels focused and non-disruptive — I never leave the page I'm on.

**Why this priority**: The modal is the core UX container for the auth workflow. It is integral to Story 1 and Story 2 and defines the interaction pattern.

**Independent Test**: On both onboarding and re-auth, the auth flow opens in a modal overlay. The modal has clear step indicators, back navigation, and dismiss behavior. The underlying page is not navigated away from.

**Acceptance Scenarios**:

1. **Given** the auth modal is open, **When** the user views it, **Then** the modal displays a clear step indicator (e.g., step 1 of 3) so the user knows where they are in the process.
2. **Given** the auth modal is on step 2 (server selection) or step 3 (library selection), **When** the user clicks "Back", **Then** the modal returns to the previous step without losing selections made so far.
3. **Given** the auth modal is open during onboarding, **When** the user clicks outside the modal or presses Escape, **Then** the modal stays open (preventing accidental dismissal during first-time setup).
4. **Given** the auth modal is open during re-authentication (from Settings), **When** the user clicks outside the modal or presses Escape, **Then** the modal closes and the existing connection remains unchanged.
5. **Given** the auth modal is in the "Waiting for Plex sign-in" state, **When** the user views it, **Then** a clear visual indicator (spinner or animation) communicates that the application is waiting for the user to complete sign-in in the browser, along with a "Open sign-in page again" link in case the popup was blocked or closed.

---

### Edge Cases

- **Multiple Plex servers on account**: The server selection step displays all servers, including remote/shared servers. Only servers that are currently online and reachable are selectable; offline servers are shown but disabled with an "Offline" indicator.
- **Server has no music libraries**: After server selection, if the chosen server has no music-type libraries, the modal shows a message explaining this and allows the user to go back and pick a different server.
- **Popup blocker prevents sign-in page**: If the browser blocks the popup/new tab, the modal detects this and displays the Plex sign-in URL as a clickable link the user can open manually.
- **Token expires mid-session**: If a Plex API call fails with an authentication error during normal use, the application prompts the user with the auth modal to re-authenticate (non-blocking — cached/pinned content remains playable).
- **Network interruption during PIN polling**: If the network drops while the application is polling for PIN completion, the modal displays a transient error and continues polling with backoff when connectivity returns.
- **User's Plex account has no servers claimed**: The modal shows a message explaining that no servers are associated with this account and links to Plex's documentation on setting up a server.
- **Re-auth with different server/account**: When the user connects to a different server or account, all local data (caches, library index, Discogs matches, pending scrobbles) is wiped automatically before the new connection is established. The user is not prompted — the wipe is automatic.
- **Server address changes (dynamic IP/port)**: If the stored server URL becomes unreachable, the application uses the stored machine identifier to re-discover the server's current address via the Plex resources API. If re-discovery succeeds, the stored URL is updated silently. If the server is not found, the user is prompted to re-authenticate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST implement Plex's PIN-based OAuth authentication flow (request a PIN from plex.tv, open the browser auth page with the PIN, poll for completion, receive the auth token).
- **FR-002**: The application MUST open the Plex sign-in page in a new browser window or tab, pre-populated with the application's client identifier, device metadata, and the generated PIN code.
- **FR-003**: The application MUST poll the Plex PIN endpoint at a reasonable interval (e.g., every 1–2 seconds) until authorization is confirmed or a timeout is reached.
- **FR-004**: The application MUST present the entire auth workflow (initiation, waiting, server selection, library selection, confirmation) within a single modal dialog.
- **FR-005**: The modal MUST display step indicators showing the user's progress through the workflow (e.g., "Step 1 of 3: Sign in", "Step 2 of 3: Select server", "Step 3 of 3: Select libraries").
- **FR-006**: The modal MUST support backward navigation between steps without losing previously entered selections.
- **FR-007**: After the user authorizes the application at plex.tv, the application MUST retrieve the list of Plex servers (resources) associated with the user's account.
- **FR-008**: The server selection step MUST display each server's name, online/offline status, and whether it is owned by the user or shared.
- **FR-009**: Only servers that are currently online and reachable MUST be selectable; offline servers MUST be shown but disabled.
- **FR-010**: After server selection, the application MUST retrieve the music libraries from the chosen server and display them for selection.
- **FR-011**: The user MUST be able to select one or more music libraries to use with the application.
- **FR-012**: Upon completion, the application MUST securely transmit the auth token to the backend, which encrypts and stores it alongside the selected server URL and library IDs (consistent with existing encrypted-credential storage).
- **FR-013**: The modal MUST be usable during both first-time onboarding and re-authentication from Settings.
- **FR-014**: During first-time onboarding, the modal MUST NOT be dismissible by clicking outside or pressing Escape.
- **FR-015**: During re-authentication from Settings, the modal MUST be dismissible, and dismissal MUST leave the existing connection unchanged.
- **FR-016**: If the Plex sign-in popup is blocked by the browser, the modal MUST display the sign-in URL as a clickable fallback link.
- **FR-017**: If PIN polling times out without authorization (e.g., 3 minutes), the modal MUST display a "Sign in was not completed" message with options to retry or cancel.
- **FR-018**: If the Plex API is unreachable during any step, the modal MUST display a user-friendly error message with a "Try Again" option.
- **FR-019**: The application MUST register itself with Plex using a consistent client identifier and descriptive device metadata (application name, device name, platform) so the user recognizes it in their Plex authorized devices list.
- **FR-020**: When a Plex API call fails with an authentication/authorization error during normal use, the application MUST prompt the user with the auth modal to re-authenticate.
- **FR-021**: The auth workflow MUST replace the existing manual token-paste onboarding flow. The manual token input fields MUST be removed from both the onboarding page and the Plex Settings section.
- **FR-022**: When the user re-authenticates with a different Plex server or Plex account (detected by comparing the server machine identifier or account ID), the application MUST automatically wipe all local data — audio caches (pre-cache and permanent pins), library index, Discogs collection matches, and pending scrobbles — and start fresh with the new connection.
- **FR-023**: Upon completion of the auth workflow, the application MUST store both the server's direct URL and its Plex machine identifier. During normal operation the direct URL is used; if the URL becomes unreachable, the application MUST attempt to re-discover the server's current address via the Plex resources API using the stored machine identifier before prompting the user to re-authenticate.
- **FR-024**: After successful authentication, the application MUST retrieve and persist the user's Plex account identity (username, email, and avatar thumbnail URL).
- **FR-025**: The application MUST display the Plex account identity (username and avatar) in a persistent sidebar or header element visible across the app, and in the Settings > Plex section.

### Key Entities

- **Plex PIN**: A temporary code generated by plex.tv that links a sign-in attempt to the application. Contains an ID, a code, and an expiry. Once the user authorizes, the PIN resolves to an auth token.
- **Plex Auth Token**: A long-lived credential that grants the application access to the user's Plex account and servers. Stored encrypted on the backend; never exposed to the browser after initial exchange.
- **Plex Account Identity**: The user's Plex profile information — username, email, and avatar thumbnail URL — retrieved after authentication and displayed in the app UI.
- **Plex Server (Resource)**: A media server registered to the user's Plex account. Has a name, connection addresses, online/offline status, an ownership flag (owned vs. shared), and a stable **machine identifier** that persists even when the server's IP or port changes.
- **Music Library**: A Plex library section of type "music" on a specific server. Has an ID and a title. The user selects which libraries the application should index and browse.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can complete the full auth flow (sign in → select server → select libraries) in under 90 seconds, excluding time spent typing Plex account credentials in the browser.
- **SC-002**: The auth modal presents no more than 3 steps, each with a clear label and progress indicator.
- **SC-003**: 100% of auth errors (network failure, timeout, no servers found, popup blocked) surface a user-understandable message with a recovery action — no silent failures or raw error codes.
- **SC-004**: Re-authentication from Settings completes without data loss — existing library data, cached content, and user preferences are fully preserved.
- **SC-005**: The manual token-paste flow is fully removed; no path in the application allows or requires direct token entry.
- **SC-006**: The application appears in the user's Plex authorized devices list with a recognizable name and icon after successful authentication.

## Assumptions

- The Plex PIN-based auth API (endpoints at `plex.tv/api/v2/pins`) remains publicly available and stable. This is the same mechanism used by Plexamp, Plex Web, and other official clients.
- The user's browser supports opening new windows/tabs (popup). A fallback link is provided if popups are blocked, but the primary flow assumes popups work.
- The existing backend infrastructure for encrypted credential storage (AES encryption via `lib/crypto.ts`, `plexConnections` table) will be reused.
- Server discovery uses the Plex resources API (`plex.tv/api/v2/resources`), which returns all servers associated with the authenticated account.
- The application is single-user, so there is no need for multi-user session management or account-linking flows.
- The existing Plex connection schema in the database may need minor additions (e.g., storing the Plex account machine identifier or user display name) but the core structure is compatible.
