# Research: Play Navigation Preference

## R-001: Centralize navigation in `usePlayNow`

**Decision**: Keep queue replacement in `playback-queue-store.playNow` and gate route changes only in `usePlayNow`.

**Rationale**: Every play-now entry point calls `usePlayNow`, which today unconditionally runs `navigate("/now-playing")` after `playNow(tracks)`. One conditional satisfies FR-004/FR-005 and automatically covers future callers (clarified 2026-05-29).

**Alternatives considered**:

- **Pass `navigate?: boolean` from each caller**: Rejected — scatters policy, easy to miss call sites.
- **Move navigation into the Zustand store**: Rejected — stores should not depend on React Router.

---

## R-002: Preference shape and storage

**Decision**: Persist string enum `"navigate" | "stay"` under `dexaudio.playback.playNavigation` with default `"navigate"`.

**Rationale**: Matches existing playback prefs in `local-storage.ts`. Invalid values coerce to `"navigate"`.

**Alternatives considered**:

- **Boolean `stayOnPageOnPlay`**: Rejected — less extensible.
- **Server-synced `app_settings`**: Rejected — YAGNI; other playback toggles are client-only.

---

## R-003: Settings UI control

**Decision**: **Radio Group** (shadcn/ui) in `PlaybackSettingsSection` with helper text per option.

**Rationale**: Two mutually exclusive destinations; radio exposes both choices immediately (SC-004) and meets WCAG expectations.

**Alternatives considered**:

- **Select dropdown**: Acceptable but hides options until opened.
- **Switch**: Rejected — implies on/off, not two destinations.

---

## R-004: Scope of play-now actions

**Decision**: Apply to **any** gesture routed through `usePlayNow` (current: track, album, artist; future: e.g. search). Exclude `addToQueue`, queue `setIndex`, and session restore.

**Rationale**: Clarification session 2026-05-29 — hook-based scope prevents spec drift when new UI adds play-now. Add-to-queue never navigated. Queue panel uses `setIndex`. `bootstrapPlaybackSession` only hydrates state.

**Alternatives considered**:

- **Enumerated list only (track/album/artist)**: Rejected — future entry points would require spec churn and risk inconsistent behavior.

---

## R-005: Stay-mode feedback

**Decision**: **No toast** when staying on page; rely on audio + header Now Playing visualizer (`AppShell` already shows `AudioVisualizerIcon` when `playing`).

**Rationale**: Clarification session 2026-05-29 — matches low-notification playback patterns; header already signals active playback without leaving the page.

**Alternatives considered**:

- **Toast with track title**: Rejected — noisy while browsing albums.
- **Toast only for bulk play (album/artist)**: Rejected — inconsistent; user chose silent for all stay-mode play-now.

---

## R-006: Session restore on reload

**Decision**: **Never** auto-navigate on session restore, regardless of preference.

**Rationale**: Clarification session 2026-05-29 (FR-010). Preference applies only to explicit play-now gestures. Current `bootstrapPlaybackSession` hydrates queue without routing; changing that would surprise users landing on library home.

**Alternatives considered**:

- **Navigate on restore when mode is `navigate`**: Rejected — conflates “start playback” with “resume session”; redirect on every reload is disruptive.

---

## R-007: Backend / API surface

**Decision**: **No backend or REST contract changes.**

**Rationale**: Pure client UX preference.

---

## R-008: Default and migration

**Decision**: Default `"navigate"` when key is absent.

**Rationale**: Preserves current `usePlayNow` behavior for existing users.
