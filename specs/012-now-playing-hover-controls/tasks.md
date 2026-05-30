---
description: "Task list for Now Playing Hover Controls"
---

# Tasks: Now Playing Hover Controls

**Input**: Design documents from `/specs/012-now-playing-hover-controls/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/ui-now-playing-controls.md, quickstart.md

**Tests**: Included. The UI contract (`contracts/ui-now-playing-controls.md`) defines component/hook behaviors as the basis for unit tests, and the repo has an established Vitest + Testing Library setup.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All paths are relative to the repository root.

## Path Conventions

- Web app, frontend workspace only: `frontend/src/`, `frontend/tests/`
- No backend, database, or API changes in this feature.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm tooling is ready; no new dependencies are required.

- [x] T001 Confirm Vitest + Testing Library config picks up new dirs (`frontend/src/components/layout`, `frontend/src/components/player`, `frontend/src/hooks`) and that `frontend/tests/setup.ts` is loaded; run `cd frontend && npm test` to establish a green baseline.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared playback action logic that the header panel and the existing Now Playing page both depend on. Extracting this first prevents behavior drift (FR-007, FR-008).

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T002 Create shared playback-controls hook in `frontend/src/hooks/use-playback-controls.ts` exposing `{ current, playing, toggle, next, previous }`, encapsulating the gapless-handoff/fade/first-track-restart logic currently inline in `frontend/src/pages/NowPlayingPage.tsx` (`onNext`, `onPrevious`, play/pause + autoplay-blocked handling). Reads `playing` from `usePlayer()` and queue actions from `usePlaybackQueue`.
- [x] T003 Refactor `frontend/src/pages/NowPlayingPage.tsx` to consume `usePlaybackControls` for its `AudioPlayer` `onNext`/`onPrevious`/play-pause wiring, ensuring identical behavior and no duplicated logic (depends on T002).

**Checkpoint**: Shared control logic exists and the existing Now Playing page still works through it.

---

## Phase 3: User Story 1 - Quick playback control from anywhere (Priority: P1) 🎯 MVP

**Goal**: Hovering/focusing/press-and-holding the header "Now Playing" button opens an overlay panel with working previous, play/pause, and next controls, without reflowing the page; tap still navigates to the Now Playing page.

**Independent Test**: With a track loaded, hover the Now Playing button → panel appears beneath it; previous/play-pause/next operate playback; moving away closes it; surrounding content never shifts.

### Tests for User Story 1 ⚠️

> Write these tests FIRST and ensure they FAIL before implementation.

- [x] T004 [P] [US1] Unit test `usePlaybackControls` in `frontend/tests/unit/use-playback-controls.test.tsx` covering H1–H4 (next/previous parity, toggle play/pause + autoplay-blocked, `playing` mirrors engine, `current` null when queue empty).
- [x] T005 [P] [US1] Unit test `useHoverIntent` in `frontend/tests/unit/use-hover-intent.test.ts` covering V1–V4 (open on pointerenter/focusin, close on pointerleave after grace delay, close on focusout, touch long-press opens & suppresses navigation, short tap does not open).
- [x] T006 [P] [US1] Unit test `NowPlayingControlPanel` interactions in `frontend/tests/unit/NowPlayingControlPanel.test.tsx` covering C2–C5, C8, C9 (control activation calls handlers, stable `aria-label`s, hidden when `open=false`).

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `frontend/src/hooks/use-hover-intent.ts` implementing open/close intent: open on `pointerenter`/`focusin`, close on `pointerleave` (with ~120ms grace) / `focusout`, and touch press-and-hold (~400ms, `pointerType==='touch'`) with tap-vs-hold disambiguation; returns `{ open, getTriggerProps, getPanelProps }` or equivalent.
- [x] T008 [US1] Create `frontend/src/components/layout/NowPlayingControlPanel.tsx`: absolute-positioned overlay (anchored beneath trigger, right-aligned, header z-index) rendering icon-only previous / play-pause / next `Button`s (lucide `SkipBack`, `Play`/`Pause`, `SkipForward`) wired to `onPrevious`/`onToggle`/`onNext`; play/pause icon + `aria-pressed` derived from `playing`; each control has a stable `aria-label`. Marquee area is a placeholder for US2. (depends on T002)
- [x] T009 [US1] Wire the panel into `frontend/src/components/layout/AppShell.tsx`: wrap the Now Playing `Link` in a `relative` container, attach `useHoverIntent` trigger/panel props, render `NowPlayingControlPanel` driven by `usePlaybackControls`. Gate so nothing is mounted/armed when `current` is null (FR-014); preserve the existing tap → `/now-playing` navigation (FR-013). (depends on T007, T008)
- [x] T010 [US1] Verify no-reflow overlay behavior: ensure panel uses absolute/overlay positioning so showing/hiding causes zero layout movement of header and main content (FR-002, SC-002); adjust positioning/stacking as needed.

**Checkpoint**: MVP — playback can be controlled from anywhere via the header with no layout shift.

---

## Phase 4: User Story 2 - See what is currently playing (Priority: P2)

**Goal**: A marquee above the controls shows "{artist} - {track}", scrolling in a continuous loop when it overflows and updating when the track changes.

**Independent Test**: Open the panel → marquee shows current "artist - track"; long values loop-scroll, short values are static; changing track updates the text.

### Tests for User Story 2 ⚠️

- [x] T011 [P] [US2] Unit test `TrackMarquee` in `frontend/tests/unit/TrackMarquee.test.tsx` covering M1–M4 (scrolls when overflowing, static when it fits, no animation under `prefers-reduced-motion`, updates when `text` prop changes).

### Implementation for User Story 2

- [x] T012 [P] [US2] Add `marquee` keyframes and `animate-marquee` utility to `theme.extend` in `frontend/tailwind.config.js` (translateX 0 → -50% continuous loop).
- [x] T013 [US2] Create `frontend/src/components/player/TrackMarquee.tsx`: measure content vs container width; when overflowing and `motion-safe`, render duplicated text with `animate-marquee`; otherwise render static text; gate animation behind `prefers-reduced-motion` via `motion-safe`/`motion-reduce` (FR-010, FR-015). (depends on T012)
- [x] T014 [US2] Integrate `TrackMarquee` into `NowPlayingControlPanel.tsx` above the controls, deriving text as `[current.artist, current.title].filter(Boolean).join(" - ")` so missing metadata omits the stray separator (FR-009, FR-011, data-model R3). (depends on T013, T008)

**Checkpoint**: Panel now shows live, overflow-aware track info above the controls.

---

## Phase 5: User Story 3 - Discover what each control does (Priority: P3)

**Goal**: Each control shows only its icon by default; hovering/focusing a single icon reveals only that control's text label, while accessible names remain always present.

**Independent Test**: Open panel → controls are icon-only; hover one icon → only its label shows; other labels stay hidden; assistive tech still announces all controls.

### Tests for User Story 3 ⚠️

- [x] T015 [P] [US3] Extend `frontend/tests/unit/NowPlayingControlPanel.test.tsx` covering C6 and C7 (icons-only by default; hovering/focusing a single control reveals only that label; others remain hidden).

### Implementation for User Story 3

- [x] T016 [US3] Add per-icon label reveal in `NowPlayingControlPanel.tsx` using Tailwind `group`/`peer` hover+focus utilities so each control's visible text label appears only when that specific icon is hovered/focused, while the persistent `aria-label` is unchanged (FR-004, FR-005, SC-003, SC-006). (depends on T008)

**Checkpoint**: All three user stories function independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, responsiveness, and final validation across stories.

- [x] T017 [P] Accessibility pass: verify keyboard focus opens the panel and Tab order reaches previous/play-pause/next with correctly announced names; confirm WCAG 2.1 AA contrast for panel surfaces (FR-015, SC-006).
- [x] T018 [P] Responsive/touch QA from 320px → desktop: panel stays within viewport, press-and-hold opens on touch, tap navigates, no horizontal overflow (FR-012b, Constitution IV).
- [x] T019 Reduced-motion verification: with OS `prefers-reduced-motion: reduce`, marquee does not animate and text remains readable (FR-015).
- [x] T020 Run `frontend/specs/012-now-playing-hover-controls/quickstart.md` manual verification checklist end-to-end and `cd frontend && npm test` + `npm run lint`; fix any failures.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories (provides `usePlaybackControls`).
- **User Stories (Phase 3–5)**: Depend on Foundational. US2 and US3 build on the panel scaffold delivered in US1 (T008/T009).
- **Polish (Phase 6)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. Delivers the panel + controls (MVP).
- **US2 (P2)**: Depends on Foundational; integrates into US1's panel (T014 needs T008).
- **US3 (P3)**: Depends on Foundational; modifies US1's panel controls (T016 needs T008).

### Within Each User Story

- Tests written first and failing before implementation.
- Hooks before components; components before AppShell wiring.

### Parallel Opportunities

- T004, T005, T006 (US1 tests) can run in parallel.
- T007 (hover-intent hook) is parallel to the US1 test authoring.
- T011 (US2 test) and T012 (tailwind keyframes) can run in parallel.
- T017 and T018 (polish) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Author US1 tests together (they should fail first):
Task: "Unit test usePlaybackControls in frontend/tests/unit/use-playback-controls.test.tsx"
Task: "Unit test useHoverIntent in frontend/tests/unit/use-hover-intent.test.ts"
Task: "Unit test NowPlayingControlPanel interactions in frontend/tests/unit/NowPlayingControlPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (`usePlaybackControls` + refactor NowPlayingPage)
3. Phase 3: User Story 1 (panel + controls + AppShell wiring)
4. **STOP and VALIDATE**: control playback from the header with no reflow.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 → in-context playback controls (MVP).
3. US2 → marquee track info.
4. US3 → per-icon discoverable labels.
5. Polish → a11y, responsive/touch, reduced-motion, quickstart.

---

## Notes

- [P] tasks = different files, no dependencies.
- No new dependencies are introduced (Constitution V); reuse existing `Button`, lucide icons, Tailwind, Radix.
- Commit after each task or logical group.
- Each user story is independently testable; stop at any checkpoint to validate.
