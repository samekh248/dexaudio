# Feature Specification: Plex Music Player with Discogs Collection Sync

**Feature Branch**: `001-plex-music-player`

**Created**: 2026-05-16

**Status**: Draft

**Input**: User description: "Build me an application that's primary function is to play music from a plex server that I specify. It must support *.mp3 and *.flac formats, with flac being the primary format. Secondary function are sharing top 10 songs (just a list with play stats), top 10 albums, top 10 artists within the app, pulling physical collection from discogs, and matching physical collection with media on the plex server. There should be a settings/admin area to configure everything"

## Clarifications

### Session 2026-05-16

- Q: Should the player expose a manual playback queue to the user? → A: Yes — the user can build, view, reorder, and remove items from a playback queue.
- Q: When the playback queue empties, what should the player do? → A: If the "auto-queue similar songs" setting is enabled, the player pulls similar songs and appends them to the queue; otherwise playback stops cleanly.
- Q: What happens to auto-queued songs when the user manually selects new content? → A: Any songs that were auto-added (not user-added) are removed from the queue, and the user's new selections are added to the queue.
- Q: Is crossfade between tracks supported? → A: Yes, as an optional user setting in the Playback section (off by default).
- Q: What is the dominant browse paradigm of the UI? → A: Album-centric — albums (with cover art) are the primary unit of browsing, discovery, and navigation throughout the application.
- Q: How should "similar songs" be sourced for the auto-queue? → A: Use Plex's built-in "sonically similar / radio" recommendations seeded from the last played track; only songs in the user's Plex library are queued.
- Q: When exactly should the auto-queue kick in? → A: When 1 track remains in the queue — pre-fetch and append similar songs so playback continues seamlessly with no gap.
- Q: When the user picks a new album/track while a queue is already playing, what should happen? → A: Two explicit actions on every album/track: "Play now" (replaces the current track, clears all auto-queued items, preserves any other user-added items) and "Add to queue" (append to the end). No implicit replacement.
- Q: How concretely should "album-centric" shape the UI? → A: Album grid is the default library landing; artist pages drill into that artist's albums (no flat track list at the artist level); the now-playing view is dominated by full-size album art. Track-only views (queue, search results) are allowed but not the primary navigation.
- Q: What is the application's form factor / platform? → A: Web application first, plus an installable desktop wrapper (e.g., PWA) so it can also feel like a real desktop app. Mobile is not a primary target in v1 but the layout should be responsive enough not to break on small screens.
- Q: Should the application support caching music on the device? → A: Yes — the application MUST support two distinct caches: (1) an on-the-fly pre-cache for upcoming/selected songs and (2) a permanent, user-pinned cache for songs/albums the user wants to keep available. When a cached copy of a track exists, the application MUST play it from the cache instead of streaming from Plex.
- Q: How does the pre-cache decide what to cache? → A: Automatic look-ahead in the playback queue only. A user-configurable setting controls the number of upcoming tracks to keep cached (e.g., next N tracks). There is no separate manual "pre-cache this" action — manual cache adds go to the permanent cache.
- Q: What units can the user pin into the permanent cache? → A: Individual tracks, entire albums, AND entire artists. Pinning an album is a shortcut for pinning all of its tracks; pinning an artist is a shortcut for pinning all of that artist's albums.
- Q: When the device runs out of cache space, what gets evicted first? → A: Each cache has its own size cap. The pre-cache (look-ahead) cache evicts within its own LRU queue once full; the permanent (pinned) cache never overflows into the pre-cache's quota and is never auto-evicted. If the permanent cache hits its cap, the user is prompted before any new pin can be added.
- Q: What happens to a cached copy when the source file changes on Plex? → A: Detect changes using Plex's per-track identifier plus a version signal (file size, hash, or last-modified). Stale cached copies are auto-invalidated; the next playback re-fetches and re-caches. Pinned items refresh in the background when invalidated.
- Q: How are cache size limits and storage configured? → A: Two user-configurable size caps in Settings (pre-cache GB, permanent-cache GB) with sensible defaults. A "Storage" sub-section shows current usage, lists cached items, and offers actions: "Clear pre-cache", "Unpin all", "Clear everything". Storage is managed by the app via the platform's standard persistent browser/PWA storage.
- Q: Should music played through the application scrobble to last.fm? → A: Yes — the application MUST integrate with last.fm and scrobble tracks the user listens to. last.fm credentials are configured in a new "Last.fm" Settings section.
- Q: When should a track be scrobbled to last.fm? → A: Follow last.fm's official rules — track must be longer than 30 seconds and have been played for at least 50% of its duration OR at least 4 minutes, whichever comes first.
- Q: Should the app send "Now Playing" updates to last.fm while a track is active? → A: No — the application only sends scrobbles (at the threshold). It does NOT call last.fm's "Now Playing" endpoint.
- Q: What happens when last.fm is unreachable or scrobble submission fails? → A: Queue failed scrobbles locally with retry/backoff for up to 24 hours; after 24 hours, drop the scrobble. The queue is durable across app restarts. Settings shows the pending count with a manual "Retry now" / "Clear queue" action.
- Q: Does adding last.fm change where in-app Top 10 statistics come from? → A: No — the in-app Top 10 lists continue to use Plex play history as the sole source. last.fm is outbound-only (scrobbles flow out; nothing flows back into the app's UI).
- Q: Which plays should be scrobbled? → A: All tracks this application actually plays to the user — user-selected, auto-queued (similar songs), and pinned/offline cache plays. Plays on other Plex clients are NOT scrobbled by this app. Offline plays are queued and submitted when last.fm is reachable (subject to the 24-hour retry window).
- Q: Should the application support theming? → A: Yes — the application MUST offer four theme modes: (1) Sync to device (follows the OS light/dark preference), (2) Light, (3) Dark, and (4) Custom (user-configurable colors). Theming is configured in a new "Appearance" Settings section.
- Q: In the Custom theme, what colors can the user configure? → A: A small, fixed palette of named semantic slots: Background, Surface, Primary Text, Secondary Text, Accent, and Now-Playing Highlight (~6 colors). The user picks each.
- Q: Should the application enforce accessibility (contrast) rules on Custom colors? → A: No — the application performs no contrast checks. The user is trusted to pick any combination they want.
- Q: How does the user see Custom theme changes while editing? → A: Live preview — color picker changes apply to the whole application UI in real time. "Reset" reverts to the last saved Custom theme; "Save" commits the current state.
- Q: How many Custom themes can the user keep? → A: A small fixed number (e.g., 3) of named Custom theme presets, with a picker to switch between them, plus duplicate and delete actions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stream music from my Plex server (Priority: P1)

As the owner of a personal Plex media server, I want to point the application at my Plex server, browse my music library, and play tracks (especially FLAC, with MP3 also supported) so that I can enjoy my collection through a dedicated music-focused interface.

**Why this priority**: This is the core reason the application exists. Without the ability to connect to a Plex server and play music, none of the secondary features have any value. It is the minimum slice that delivers a usable product.

**Independent Test**: After entering a Plex server address and authentication credentials in the initial setup, the user can browse an album-centric music library (albums grid as primary view, with drill-down to tracks), build a playback queue, select a FLAC or MP3 track, press play, and hear audio with working transport controls (play, pause, next, previous, seek, volume). No other features need to exist for this story to be complete and valuable.

**Acceptance Scenarios**:

1. **Given** the application is launched for the first time, **When** the user provides a valid Plex server URL and authentication credentials, **Then** the application confirms the connection and lists the available music libraries on that server.
2. **Given** the application is connected to a Plex server, **When** the user opens the music library, **Then** the primary view is an album-centric layout (album covers as the main browsable unit) including both FLAC and MP3 albums.
3. **Given** a FLAC track is selected, **When** the user presses Play, **Then** audio begins playing in lossless quality and an album-art-prominent "now playing" view shows track title, artist, album, album art, and elapsed/remaining time.
4. **Given** a track is playing, **When** the user uses transport controls (pause, resume, seek, skip to next, return to previous, change volume), **Then** the playback responds correctly to each control.
5. **Given** a queue of multiple tracks, **When** the current track ends, **Then** the next track plays automatically without user intervention.
6. **Given** the user has built or is playing a queue, **When** the user opens the queue view, **Then** the user can see all queued items in order, reorder them, and remove items, with auto-queued items visually distinguished from user-added items.
7. **Given** the "auto-queue similar songs" setting is enabled and the queue has only 1 track remaining, **When** that condition is reached, **Then** the application pre-fetches similar songs from Plex's sonically-similar/radio recommendations (seeded from the last played track, limited to the user's library) and appends them so playback continues without an audible gap.
8. **Given** the auto-queue has added songs to the queue, **When** the user invokes "Play now" on a different album or track, **Then** every auto-queued song is removed from the queue, any user-added items remain in the queue in their existing order, and the new selection begins playing immediately.
9. **Given** a queue is playing, **When** the user invokes "Add to queue" on an album or track, **Then** the selection is appended to the end of the queue without interrupting the currently playing track.
10. **Given** the "crossfade" setting is enabled with a configured duration, **When** one track transitions to the next, **Then** the outgoing track fades out while the incoming track fades in over the configured duration.
11. **Given** an MP3 track is selected, **When** the user presses Play, **Then** the MP3 plays successfully (MP3 is supported as a secondary format).
12. **Given** the Plex server is unreachable or credentials are invalid, **When** the user attempts to connect, **Then** the application shows a clear, actionable error message and does not silently fail.
13. **Given** a queue is playing and the pre-cache look-ahead is set to N, **When** playback advances, **Then** the next N upcoming tracks in the queue are downloaded into the pre-cache in the background.
14. **Given** a track has a non-stale copy in either cache, **When** the user presses Play on that track, **Then** the application plays the cached copy instead of streaming from Plex, and the UI indicates that playback is from cache.
15. **Given** the user pins a track, album, or artist, **When** the pin is accepted, **Then** the affected tracks are downloaded into the permanent cache and a pin indicator appears in the UI on the relevant items.
16. **Given** an item is pinned and the Plex server is unreachable, **When** the user plays that item, **Then** playback proceeds from the permanent cache without requiring Plex connectivity.
17. **Given** pinning a new item would exceed the permanent cache cap, **When** the user attempts to pin, **Then** the application prompts the user to increase the cap, unpin other items, or cancel.
18. **Given** the source file for a cached track changes on Plex (different size/hash/last-modified), **When** the application detects this, **Then** the cached copy is invalidated and re-fetched (immediately for pre-cache items on next play; in the background for pinned items).
19. **Given** last.fm is connected and a track longer than 30 seconds plays past the 50% / 4-minute threshold, **When** the threshold is reached, **Then** the application submits a scrobble to last.fm with the track's title, artist, album, and original play-start timestamp.
20. **Given** last.fm is unreachable when a scrobble would be submitted, **When** the submission fails, **Then** the scrobble is queued locally and retried with backoff; if the original play event was within the last 24 hours, submission eventually succeeds when last.fm is reachable again; otherwise, the queued scrobble is dropped.
21. **Given** a track shorter than 30 seconds or skipped before the threshold, **When** playback ends, **Then** no scrobble is submitted.
22. **Given** the user disconnects or revokes the last.fm session, **When** scrobbles would otherwise be submitted, **Then** they continue to be queued (within the 24-hour window) and the Last.fm Settings section prompts the user to re-authenticate.

---

### User Story 2 - View listening statistics (top 10 songs, albums, artists) (Priority: P2)

As a user of the music player, I want to see my top 10 most-played songs, top 10 most-played albums, and top 10 most-played artists with their play counts so that I can reflect on my listening habits and rediscover favorites.

**Why this priority**: Once a user is actively listening (Story 1), surfacing personal statistics provides ongoing engagement and personal value. It enriches the experience but the player is still usable without it.

**Independent Test**: After at least some listening history exists on the connected Plex server, the user can open a "Stats" or "Top 10" view and see three ranked lists (songs, albums, artists), each showing exactly up to 10 items along with a play-count number per item. The lists update as new plays accumulate.

**Acceptance Scenarios**:

1. **Given** the user has listening history on the Plex server, **When** the user opens the statistics view, **Then** three lists are displayed: Top 10 Songs, Top 10 Albums, and Top 10 Artists.
2. **Given** the Top 10 Songs list is displayed, **When** the user views an entry, **Then** the entry shows song title, artist, album, and number of plays.
3. **Given** the Top 10 Albums list is displayed, **When** the user views an entry, **Then** the entry shows album title, artist, and aggregate plays for that album.
4. **Given** the Top 10 Artists list is displayed, **When** the user views an entry, **Then** the entry shows artist name and aggregate plays for that artist.
5. **Given** fewer than 10 items have play history, **When** the user opens the statistics view, **Then** the lists show only the items that exist, without padding or errors.
6. **Given** new plays accumulate after the statistics view was opened, **When** the user refreshes or reopens the view, **Then** the rankings and play counts reflect the latest data.

---

### User Story 3 - Import and match a Discogs physical collection (Priority: P3)

As a music collector who tracks vinyl/CD releases on Discogs, I want the application to pull my physical collection from Discogs and tell me which items I already have available digitally on my Plex server (and which I do not) so that I can see gaps in my digital library and find the digital version of a physical record I want to listen to.

**Why this priority**: This is a delight-and-power-user feature that adds significant value to collectors but is not required for the core listening or stats experience. It is meaningful only after stories 1 and 2 are in place.

**Independent Test**: After providing Discogs credentials/username in settings, the user can trigger a sync and then open a "Collection" view that lists their Discogs-registered physical releases. Each release shows a match status (matched / partially matched / not on Plex) and, for matched releases, links to the corresponding Plex album so the user can play it.

**Acceptance Scenarios**:

1. **Given** the user has provided valid Discogs credentials and a username, **When** the user triggers a collection sync, **Then** the application retrieves the user's physical collection from Discogs and stores it locally.
2. **Given** a Discogs collection has been synced, **When** the user opens the collection view, **Then** each release is displayed with its title, artist, year, format (e.g., Vinyl, CD), and a match status against the Plex library.
3. **Given** a Discogs release matches an album on the Plex server, **When** the user views that release, **Then** the user sees a "Matched" indicator and can navigate directly to the Plex album to play it.
4. **Given** a Discogs release has no corresponding album on Plex, **When** the user views that release, **Then** the user sees a clear "Not on Plex" indicator.
5. **Given** the user wants to update their collection, **When** the user triggers a re-sync, **Then** newly added Discogs items are pulled and re-matched against the current Plex library.
6. **Given** the user filters the collection view, **When** the user selects "Not on Plex", **Then** only unmatched releases are shown (so the user can see gaps in their digital library).

---

### User Story 4 - Configure everything from a settings/admin area (Priority: P2)

As the operator of this personal application, I want a dedicated settings/admin area where I can configure the Plex connection, Discogs connection, playback preferences, library refresh behavior, and matching rules so that I have a single place to manage how the application behaves.

**Why this priority**: A minimal settings flow is implicit in Story 1 (the user must somehow provide the Plex server). A dedicated, comprehensive admin area is required by the user but can begin as the simple Plex setup and expand alongside Stories 2 and 3. P2 reflects that it is required for a complete v1 but can be incrementally built.

**Independent Test**: From any screen in the application, the user can open a Settings area and find clearly labeled sections for Plex, Discogs, Playback, Library, and Matching. Changing a value in any section and saving it persists across application restarts and immediately affects the relevant behavior (e.g., changing the Plex server reconnects to the new server).

**Acceptance Scenarios**:

1. **Given** the user is anywhere in the application, **When** the user opens Settings, **Then** the user sees clearly grouped sections for: Plex Server, Discogs, Playback, Library, and Matching.
2. **Given** the user updates the Plex server URL or credentials, **When** the user saves, **Then** the application validates the new connection and uses it for subsequent requests, or reports a clear error if the new connection fails.
3. **Given** the user updates Discogs credentials/username, **When** the user saves, **Then** subsequent Discogs syncs use the new credentials.
4. **Given** the user updates a playback preference (e.g., preferred format priority, crossfade on/off, default volume), **When** the user saves, **Then** the preference takes effect on the next playback action.
5. **Given** the user updates library refresh behavior (e.g., manual refresh only vs. on app launch), **When** the user saves, **Then** future library refreshes follow that setting.
6. **Given** the user updates the Discogs-to-Plex matching strictness (e.g., require exact match vs. fuzzy match), **When** the user re-runs matching, **Then** the new strictness is applied.
7. **Given** sensitive credentials (Plex token, Discogs token), **When** stored, **Then** they are not displayed in plain text in the UI by default (masked, with a reveal-on-demand option).
8. **Given** the user opens the Appearance section, **When** the user picks one of Sync to device / Light / Dark / Custom, **Then** the application switches its theme immediately and persists the choice across restarts.
9. **Given** the active theme mode is "Sync to device", **When** the underlying OS / browser light-vs-dark preference changes, **Then** the application's appearance updates immediately without a manual refresh.
10. **Given** the Custom theme mode is selected, **When** the user opens the active Custom preset editor and changes any of the six color slots, **Then** the entire application UI reflects the change in real time as the user picks; "Reset" reverts to the last saved state of that preset; "Save" commits it.
11. **Given** the user has more than one Custom theme preset, **When** the user picks a different preset, **Then** the application switches to that preset's colors immediately.
12. **Given** the user attempts to delete their last remaining Custom theme preset, **When** the deletion is requested, **Then** the application prevents deletion (or auto-creates a fresh default preset) so at least one Custom preset always exists.

---

### Edge Cases

- **Plex server offline or unreachable mid-session**: Active playback continues from any buffered audio; further actions show a clear "Plex unreachable" state with a retry option, and library browsing falls back to a cached view if available.
- **FLAC file too large or network too slow to stream smoothly**: Playback indicates buffering and resumes when ready; the user is informed if a track cannot be played reliably.
- **Unsupported format on Plex** (e.g., AAC, OGG): The track is shown in the library but marked as unsupported and cannot be played by this application (only MP3 and FLAC are in scope).
- **Discogs rate limits exceeded during sync**: Sync pauses and resumes automatically once the rate limit window resets; the user sees progress and an estimated completion.
- **Discogs release with no obvious match on Plex** (slight differences in artist/title/year): Matching uses normalized comparison and (per settings) optional fuzzy matching; ambiguous matches are flagged for user review rather than auto-confirmed.
- **Multiple Plex music libraries on the same server**: The user can select which library/libraries are active sources.
- **Empty library or empty listening history**: Stats view and library view both render gracefully with helpful empty states (no crash, no infinite spinner).
- **Invalid or expired Plex/Discogs credentials**: The application surfaces the error in Settings with a direct path to re-enter credentials.
- **Concurrent playback on another Plex client**: This application does not assume exclusive playback; it does not interfere with other Plex clients.
- **Settings change while a track is playing**: Playback is not interrupted by unrelated setting changes; reconnect-triggering changes (e.g., switching Plex servers) prompt the user before disrupting playback.
- **Auto-queue cannot find similar songs** (e.g., very niche artist, small library): The application stops playback cleanly at the end of the queue and surfaces a non-blocking notice that no similar songs were found.
- **User manually selects new content while auto-queue is mid-track**: The currently playing auto-queued track is allowed to finish (or the user can skip it); subsequent auto-queued items are removed before the user's new selections play.
- **Crossfade duration longer than remaining track length**: The application caps the effective crossfade at the shorter of the configured duration or the remaining audio of either track to avoid premature cutoffs.
- **Plex unreachable but pinned content is cached**: Pinned items continue to play from the permanent cache; browsing falls back to the cached library view; non-pinned items show as unplayable until Plex is reachable.
- **Cache write fails mid-download** (network drops, storage full mid-write): The partial file is discarded and not used for playback; the application falls back to streaming for the affected track and retries the cache fetch later.
- **Pinning an item that would exceed the permanent cache cap**: The application prompts the user before adding the pin, offering to increase the cap, unpin other items, or cancel the pin.
- **Pinned album/artist on Plex gets a new release**: The new tracks are automatically downloaded into the permanent cache in the background (subject to the cap) without user intervention.
- **Cached track invalidated mid-playback** (e.g., file replaced on Plex during playback): The currently playing audio finishes from the cached copy; the next playback of the same track triggers re-fetch and re-cache.
- **Track shorter than 30 seconds**: Per last.fm rules, the track is not scrobbled; it still plays normally and still contributes to Plex's play history.
- **User skips a track before the scrobble threshold is met**: No scrobble is submitted (consistent with last.fm rules), and the track is not queued for later submission.
- **Last.fm unreachable for an extended period**: Pending scrobbles are retried for up to 24 hours from the original play event; the Last.fm Settings section shows the pending count. Scrobbles older than 24 hours are dropped.
- **Last.fm session expired or revoked**: The application reports the failure in the Last.fm Settings section and prompts re-authentication; scrobbles continue to be queued (up to the 24-hour window) so that no plays are lost during the re-auth flow.
- **Same track played multiple times in succession**: Each completed play (meeting the threshold) MUST submit its own scrobble; the application MUST NOT deduplicate consecutive scrobbles of the same track.
- **OS / browser light-vs-dark preference changes during a session** (and the active mode is "Sync to device"): The application updates its appearance immediately without requiring a refresh.
- **User picks a Custom theme color combination that is unreadable**: The application still saves and applies it (no contrast enforcement); the user can recover by switching to a different theme mode or resetting the preset.
- **User attempts to delete the last remaining Custom theme preset**: The application disallows deletion of the final preset (or auto-creates a new default-named blank preset) so the Custom mode always has at least one preset.
- **Custom theme storage cleared / data wiped via "Clear everything"**: Theme mode falls back to "Sync to device" and any saved Custom presets are removed.

## Requirements *(mandatory)*

### Functional Requirements

#### Plex Connection & Playback (Primary)

- **FR-001**: The application MUST allow the user to specify a Plex server (address/URL and authentication credentials) and connect to it.
- **FR-002**: The application MUST validate the Plex connection and report success or a clear, actionable error.
- **FR-003**: The application MUST list available music libraries on the connected Plex server and allow the user to choose which to use.
- **FR-004**: The application MUST allow the user to browse the chosen music library by artist, album, and track.
- **FR-005**: The application MUST play tracks in FLAC format (primary supported format) with audio quality equivalent to the source file.
- **FR-006**: The application MUST play tracks in MP3 format (secondary supported format).
- **FR-007**: The application MUST display a "now playing" view including track title, artist, album, album art (when available), and elapsed/remaining time.
- **FR-008**: The application MUST provide transport controls: play, pause, resume, stop, seek within a track, skip to next track, return to previous track, and volume control.
- **FR-009**: The application MUST support a playback queue and automatically advance to the next track when one ends.
- **FR-010**: The application MUST allow the user to search the music library by artist, album, and track title.
- **FR-011**: The application MUST clearly indicate which tracks are unsupported (anything other than MP3 or FLAC) and prevent playback of unsupported formats with a helpful message.
- **FR-012**: The user MUST be able to view, reorder, and remove items in the playback queue.
- **FR-013**: When the "auto-queue similar songs" setting is enabled and only 1 track remains in the queue, the application MUST pre-fetch and append a set of similar songs to the queue so playback continues seamlessly with no audible gap. Similar songs MUST be sourced from Plex's built-in sonically-similar / radio recommendations, seeded from the last played track, and limited to tracks present in the user's connected Plex library. When the setting is disabled, playback MUST stop cleanly at the end of the queue with no auto-additions.
- **FR-014**: Every album and track in the UI MUST expose two explicit actions: "Play now" and "Add to queue". "Play now" MUST replace the currently playing track with the new selection, remove all auto-queued items from the queue, and preserve any user-added items already in the queue. "Add to queue" MUST append the selection to the end of the current queue without interrupting playback. The application MUST NOT implicitly replace the queue on a single click.
- **FR-015**: The application MUST clearly distinguish auto-queued items from user-added items in the queue view (e.g., a visual indicator).
- **FR-016**: The application MUST support optional crossfade between consecutive tracks, controlled by a user setting (on/off and duration). When disabled, tracks transition without overlap.
- **FR-017**: The user interface MUST be album-centric:
  - The default library landing view MUST be an album grid (album cover art as the primary visual element).
  - Artist pages MUST drill into the list of that artist's albums; there MUST NOT be a flat "all tracks by this artist" view at the artist level (drilling further into an album reveals its tracks).
  - The now-playing view MUST be dominated by full-size album art as the primary visual element.
  - Track-level views (the playback queue, search results, top-10 stats) are permitted but MUST NOT replace the album-centric primary navigation.

#### Media Caching

- **FR-018**: The application MUST maintain two independent on-device caches: (a) a **pre-cache** for automatic queue look-ahead, and (b) a **permanent cache** for user-pinned items. Each cache has its own user-configurable size cap (in GB) with a sensible default.
- **FR-019**: When a track is to be played, the application MUST first check both caches for a valid (non-stale) copy and play the cached copy when present, instead of streaming from Plex.
- **FR-020**: The pre-cache MUST automatically download the next N upcoming tracks in the playback queue, where N is a user-configurable setting (default behavior: a small look-ahead, e.g., 1–10 tracks). The pre-cache MUST update as the queue changes (e.g., advance, reorder, replace).
- **FR-021**: The pre-cache MUST evict its own items using a least-recently-used (LRU) policy when its size cap is reached. It MUST NOT evict items from the permanent cache.
- **FR-022**: The user MUST be able to pin items to the permanent cache at three levels: (a) individual track, (b) entire album (all tracks in the album), and (c) entire artist (all albums by the artist). Pinning at album or artist level MUST also keep the cache up to date when new tracks/albums for that pin appear on Plex (e.g., a new album by a pinned artist is automatically downloaded).
- **FR-023**: The permanent cache MUST NOT be auto-evicted. If pinning a new item would exceed the permanent cache's size cap, the application MUST prompt the user before adding it (e.g., "Permanent cache full — increase the cap, unpin something, or cancel").
- **FR-024**: The application MUST detect when a cached track is stale by comparing a version signal (file size, content hash, or last-modified metadata returned by Plex) against the cached version. Stale entries MUST be auto-invalidated and re-fetched on next playback. Stale pinned items MUST be re-fetched in the background.
- **FR-025**: The application MUST allow playback of pinned items even when Plex is unreachable, provided the cached audio is present and not flagged stale. Pre-cached items MAY also be playable offline.
- **FR-026**: A dedicated "Storage" sub-section in Settings MUST display: current total usage, usage per cache (pre-cache vs. permanent), a list of pinned items, the configured size caps, and the actions: "Clear pre-cache", "Unpin all", "Clear everything".
- **FR-027**: The application MUST clearly indicate in the UI when a track is being played from cache vs. streamed (e.g., a small badge or icon in the now-playing view), and which items are currently pinned (e.g., a pin icon on album cards and track rows).

#### Listening Statistics (Secondary)

- **FR-040**: The application MUST display a Top 10 Songs list, ordered by play count descending, each item showing title, artist, album, and play count.
- **FR-041**: The application MUST display a Top 10 Albums list, ordered by aggregate play count descending, each item showing album, artist, and play count.
- **FR-042**: The application MUST display a Top 10 Artists list, ordered by aggregate play count descending, each item showing artist and play count.
- **FR-043**: Each Top 10 list MUST gracefully display fewer than 10 entries when fewer items have history.
- **FR-044**: Statistics MUST be derived from the listening data available on the connected Plex server.
- **FR-045**: The user MUST be able to refresh statistics on demand.

#### Discogs Collection & Matching (Secondary)

- **FR-030**: The application MUST allow the user to provide Discogs credentials and a username in settings.
- **FR-031**: The application MUST be able to pull the user's physical collection from Discogs.
- **FR-032**: The application MUST persist the synced Discogs collection locally so the collection view is available without re-syncing every visit.
- **FR-033**: The application MUST display the collection with at least: release title, artist, year, and physical format (Vinyl, CD, etc.).
- **FR-034**: The application MUST match each Discogs release against the connected Plex music library and assign a match status (e.g., Matched, Partial Match, Not on Plex).
- **FR-035**: For matched releases, the application MUST provide a one-click path from the collection entry to the corresponding Plex album, ready to play.
- **FR-036**: The application MUST allow the user to filter the collection by match status (e.g., "Show only items not on Plex").
- **FR-037**: The application MUST allow the user to manually override a match (confirm an ambiguous match, or clear an incorrect match).
- **FR-038**: The application MUST support re-syncing the Discogs collection on demand and incrementally re-matching against the current Plex library.

#### Settings / Admin Area

- **FR-050**: The application MUST provide a dedicated settings/admin area accessible from a stable location in the UI.
- **FR-051**: Settings MUST be grouped into clearly labeled sections: Plex Server, Discogs, Last.fm, Playback, Library, Matching, Storage, and Appearance.
- **FR-052**: Settings changes MUST persist across application restarts.
- **FR-053**: Sensitive credentials (Plex token, Discogs token, Last.fm session key) MUST be masked by default in the UI, with an explicit reveal action.
- **FR-054**: Sensitive credentials MUST be stored at rest using a protection mechanism appropriate to the deployment platform (i.e., not as readable plain text on disk).
- **FR-055**: The application MUST validate new Plex, Discogs, and Last.fm credentials when saved and surface any failure clearly.
- **FR-056**: The user MUST be able to clear/reset credentials and stored data (Plex config, Discogs config, Last.fm session, synced collection, cached library, pending scrobble queue).
- **FR-057**: The Matching section MUST allow the user to choose a matching strictness (e.g., strict vs. fuzzy) for Discogs-to-Plex matching.
- **FR-058**: The Playback section MUST include a toggle for "auto-queue similar songs" and a toggle plus duration control for "crossfade".
- **FR-059**: The Playback section MUST include a numeric control for the pre-cache look-ahead size (number of upcoming tracks to keep cached).
- **FR-060**: The Storage section MUST include configurable size caps (in GB) for both the pre-cache and the permanent cache, with sensible defaults applied on first run.

#### Cross-cutting

- **FR-070**: The application MUST present clear empty states and error states (no infinite spinners, no silent failures).
- **FR-071**: The application MUST not interfere with other Plex clients or alter library data on the Plex server (beyond what is required for playback reporting that Plex itself performs).
- **FR-072**: The application MUST function for a single primary user (the operator who configures it).
- **FR-073**: The application MUST be delivered as a web application that runs in a modern desktop browser, AND MUST be installable as a desktop application (e.g., a PWA / installable web app) so it can launch in its own window without browser chrome.
- **FR-074**: The application layout MUST remain functional and readable on smaller viewports (e.g., a phone-sized browser window) even though mobile is not a primary target in v1 — no element may overflow off-screen and core actions (browse albums, play, view queue, open settings) MUST remain reachable.

#### Appearance & Theming

- **FR-090**: The application MUST offer four selectable theme modes: (a) **Sync to device** (follows the OS / browser light-vs-dark preference and updates live when that preference changes), (b) **Light**, (c) **Dark**, and (d) **Custom** (user-defined colors).
- **FR-091**: The default theme mode on first launch MUST be "Sync to device".
- **FR-092**: The Custom theme MUST expose a fixed set of named color slots: Background, Surface, Primary Text, Secondary Text, Accent, and Now-Playing Highlight. The user MUST be able to pick a color for each slot.
- **FR-093**: The application MUST support a small fixed number of Custom theme presets (e.g., up to 3), each with a user-editable name. The user MUST be able to switch between presets, duplicate a preset, and delete a preset (except that at least one preset MUST always exist).
- **FR-094**: While editing a Custom theme preset, the application MUST apply color changes to the entire application UI **live** (real-time preview) so the user sees the result as they pick. "Reset" MUST revert to the last saved state of the preset, and "Save" MUST commit the current state.
- **FR-095**: The application MUST NOT perform contrast / WCAG checks on Custom theme colors; the user is free to choose any combination, and no warning or block is shown for low-contrast choices.
- **FR-096**: Theme selection (mode and active Custom preset) MUST persist across application restarts.
- **FR-097**: When the active theme mode is "Sync to device", the application MUST update its appearance immediately when the underlying OS / browser preference changes (without requiring a manual refresh).

#### Last.fm Scrobbling

- **FR-080**: The application MUST integrate with last.fm and submit a scrobble for every track this application plays to the user, regardless of playback source (streamed from Plex, played from pre-cache, or played from the permanent cache).
- **FR-081**: Scrobbles MUST follow last.fm's official rules: only tracks longer than 30 seconds are eligible; a track is scrobbled once it has been played for at least 50% of its duration OR at least 4 minutes of playback, whichever comes first.
- **FR-082**: The application MUST NOT call last.fm's "Now Playing" endpoint. Only scrobbles (per FR-081) are submitted.
- **FR-083**: The application MUST NOT scrobble plays occurring on other Plex clients; scrobbling is scoped strictly to playback events originating in this application.
- **FR-084**: When last.fm is unreachable or a scrobble submission fails, the application MUST queue the scrobble locally and retry submission with backoff. The queue MUST persist across application restarts. Scrobbles MUST be retried for up to 24 hours from the time of the original play event; after 24 hours, the queued scrobble is dropped.
- **FR-085**: Plays that occur while last.fm is unreachable (e.g., offline playback of pinned items) MUST be queued and submitted to last.fm in original-play-event order when connectivity returns, subject to the 24-hour retry window.
- **FR-086**: The application MUST surface a Last.fm Settings section with: authentication (connect / disconnect), connection status, the current pending-scrobble queue count, and manual "Retry now" and "Clear queue" actions. The Last.fm session credential MUST be treated as sensitive per FR-053 and FR-054.
- **FR-087**: The in-app Top 10 statistics MUST continue to be sourced exclusively from Plex play history; last.fm is outbound-only and MUST NOT be used as a source for any in-app statistic in v1.

### Key Entities *(include if feature involves data)*

- **Plex Server Connection**: The user-configured target server, including address and authentication credentials, plus a chosen set of active music libraries.
- **Music Library**: A collection of artists, albums, and tracks available on the connected Plex server. Tracks have an associated format (FLAC, MP3, or unsupported).
- **Track**: An individual playable item with title, artist, album, duration, format, and (from Plex) play count and last played time.
- **Album**: A grouping of tracks with title, artist, year, and album art. Has an aggregate play count derived from its tracks.
- **Artist**: A creator of albums and tracks. Has an aggregate play count derived from associated tracks.
- **Playback Queue**: An ordered list of tracks scheduled to play, including the current item and its position. Each queue item is tagged as either user-added or auto-queued so the application can clear only auto-queued items when the user makes a new manual selection.
- **Top 10 Stat List**: A ranked list (songs, albums, or artists) of up to 10 entries with associated play-count values.
- **Discogs Account**: The user-configured Discogs credentials and username used to pull the physical collection.
- **Physical Release**: An item in the user's Discogs collection, with title, artist, year, and physical format (Vinyl, CD, etc.).
- **Collection Match**: A relationship between a Physical Release and a Plex Album, with a status (Matched / Partial / Not on Plex) and optional manual override.
- **Settings**: Persistent configuration grouped into Plex, Discogs, Playback, Library, Matching, and Storage sections.
- **Cache Entry**: A locally stored copy of a track's audio bytes, with the source track identifier, a version signal (size/hash/last-modified) for staleness checks, and a `cache_kind` of either `pre-cache` or `permanent`.
- **Pin**: A user-created assertion that an item should live in the permanent cache. Has a `pin_level` of `track`, `album`, or `artist`, and resolves to a set of underlying track Cache Entries that the application keeps populated.
- **Cache Configuration**: User-controlled values: pre-cache size cap (GB), permanent-cache size cap (GB), pre-cache look-ahead count (number of upcoming tracks).
- **Last.fm Account**: The user-configured last.fm authentication state (session credential and connection status) used to submit scrobbles. Treated as a sensitive credential.
- **Scrobble**: A record of a play event that meets last.fm's scrobble rules (track >30s, played ≥50% or ≥4 minutes). Each scrobble carries the track identity (title, artist, album) and the timestamp at which the play started.
- **Pending Scrobble Queue**: An ordered, durable queue of Scrobble records that have not yet been successfully submitted to last.fm. Items remain in the queue with retry/backoff for up to 24 hours from the original play event, then are dropped.
- **Theme Selection**: The currently active theme mode (Sync to device / Light / Dark / Custom) plus, when Custom is active, the identifier of the active Custom Theme Preset.
- **Custom Theme Preset**: A user-named record holding six color values, one per named slot (Background, Surface, Primary Text, Secondary Text, Accent, Now-Playing Highlight). The user keeps up to a small fixed number of presets and switches between them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can connect the application to a Plex server and start playing a FLAC track within 5 minutes of first launch.
- **SC-002**: From hitting Play on any FLAC or MP3 track in the library, audio begins playing within 3 seconds on a typical home network.
- **SC-003**: The "now playing" view always reflects the actually-playing track within 1 second of a track change (no stale metadata).
- **SC-004**: At least 95% of standard FLAC files (16-bit/44.1kHz and 24-bit) and standard MP3 files (CBR and VBR) present on the Plex server are playable end-to-end without error.
- **SC-005**: Each of the three Top 10 lists loads and renders within 2 seconds of opening the statistics view on a library with up to 50,000 tracks.
- **SC-006**: Syncing a Discogs collection of up to 2,000 releases completes within 5 minutes on a typical home network, including matching against the Plex library.
- **SC-007**: For a representative Discogs collection, at least 90% of releases that exist on Plex are auto-matched correctly without manual intervention.
- **SC-008**: Users can locate and change any of the documented settings (Plex, Discogs, Playback, Library, Matching) within 60 seconds of opening Settings, without needing external documentation.
- **SC-009**: 100% of user-visible errors (e.g., bad credentials, server unreachable, sync failure) display a clear message and at least one suggested next action.
- **SC-010**: No stored credential is visible in plain text in the UI by default.
- **SC-011**: When a track is played from cache, audio begins within 1 second of hitting Play on a typical device.
- **SC-012**: With the Plex server unreachable, 100% of pinned (permanent-cache) tracks that have completed downloading remain playable without errors.
- **SC-013**: When the user advances through a queue, at least 95% of the time the next track is already pre-cached and starts without any visible buffering, assuming the configured look-ahead count is greater than or equal to 1 and there is sufficient network bandwidth.
- **SC-014**: With last.fm connected and reachable, 100% of eligible plays (track >30s played ≥50% or ≥4 minutes) result in a scrobble being submitted within 30 seconds of the threshold being met.
- **SC-015**: When last.fm is reachable again after an outage of less than 24 hours, 100% of scrobbles queued during the outage are submitted (in original-play-event order) within 5 minutes of reconnection.
- **SC-016**: No scrobble is ever submitted to last.fm for plays occurring on other Plex clients or for tracks that did not meet the scrobble threshold.
- **SC-017**: Switching between theme modes (Sync to device / Light / Dark / Custom) applies visually within 200 ms of the user's selection.
- **SC-018**: When editing a Custom theme preset, changing a color slot updates the application UI within 200 ms (live preview).
- **SC-019**: When the active mode is "Sync to device" and the OS/browser preference toggles, the application reflects the change within 1 second without a manual refresh.

## Assumptions

- The application is for a single primary user (the operator). Multi-tenant / multi-account use is out of scope for v1.
- The user has an existing, working Plex server with a music library and standard Plex authentication (token-based). The application is not responsible for setting up or repairing the Plex server.
- The user has an existing Discogs account and is willing to provide an API token / username. The application is not responsible for managing the Discogs account itself.
- Listening statistics (play counts) are sourced from Plex's own play history. The application does not need to build a parallel scrobble database in v1; it surfaces what Plex already tracks.
- Album art and metadata come from Plex's existing metadata; this application does not fetch or curate cover art independently.
- Only MP3 and FLAC are in scope. Other formats present on Plex are visible but explicitly marked unsupported.
- "Sharing top 10" in the user's brief refers to displaying these lists inside the application (an at-a-glance personal dashboard), not exporting or publishing them externally.
- The application is delivered as a web application that is also installable as a desktop app (PWA-style). Mobile is not a primary v1 target but layouts must not break on smaller screens.
- The application will run on a network where it can reach both the user's Plex server and the public Discogs API.
- Discogs API rate limits and Plex API behavior are taken as-is; the application must handle them gracefully but cannot lift them.
- Settings persistence uses a local store on the device/host running the application; sync across multiple devices is out of scope for v1.
- On-device caches (pre-cache and permanent cache) are local to the device running the application; cache contents are not synced across multiple devices in v1. Storage uses the platform's standard persistent browser/PWA storage, subject to platform quotas.
- The Plex API exposes a per-track identifier and at least one version signal (size, hash, or last-modified) usable for cache invalidation; the application relies on this being available.
- The user has (or is willing to create) a last.fm account and authorize this application to submit scrobbles. The application is not responsible for managing the last.fm account itself.
- last.fm's standard scrobble API rules (track >30s, 50% / 4-minute threshold, "Now Playing" optional) are taken as the canonical specification for what constitutes a scrobble.
