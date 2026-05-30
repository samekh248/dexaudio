---
description: "Task list for Volume Icon with Vertical Slider"
---

# Tasks: Volume Icon with Vertical Slider

**Input**: Design documents from `/specs/016-volume-icon-slider/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-volume-control.md, quickstart.md

**Tests**: Not required by spec. Optional unit tests are listed in the Polish phase only.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3
- Paths are relative to the repository root (`frontend/` workspace).

## Path Conventions

- Frontend only: `frontend/src/`, `frontend/tests/`
- No backend, database, or API changes.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, active plan, and green test baseline.

- [x] T001 Verify branch `016-volume-icon-slider` is checked out and `specs/016-volume-icon-slider/plan.md` is the active plan in `.cursor/rules/specify-rules.mdc`
- [x] T002 Run `cd frontend && npm test` to confirm Vitest baseline is green before changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared `VolumeControl` used by Now Playing page and header panel. Blocks all user stories.

**⚠️ CRITICAL**: No user story work until this phase is complete.

- [x] T003 Create `frontend/src/components/player/VolumeControl.tsx`: Radix `Popover` trigger (icon `Button`), portaled `Popover.Content` with `side="top"`, vertical shadcn `Slider` (`orientation="vertical"`, top=louder, 0–100 mapped to 0–1), controlled `open` with outside dismiss and Escape; props `volume`, `onVolume`, optional `forceClosed`; `aria-label` on trigger and slider per contract V1–V10
- [x] T004 Implement muted vs sound-on icons in `frontend/src/components/player/VolumeControl.tsx`: `VolumeX` when `volume === 0`, `Volume2` when `volume > 0` (FR-010, contract V6–V7); live `onVolume` on drag (depends on T003)

**Checkpoint**: `VolumeControl` can be mounted in isolation with working popover, vertical slider, and icon states.

---

## Phase 3: User Story 1 - Adjust volume on the Now Playing page (Priority: P1) 🎯 MVP

**Goal**: Replace the always-visible horizontal volume bar on the Now Playing page with the sound icon + vertical slider popover.

**Independent Test**: On `/now-playing` with a track loaded, only a sound icon is visible until clicked; vertical slider adjusts audible volume; horizontal bar is gone; dismiss restores icon-only UI.

### Implementation for User Story 1

- [x] T005 [US1] Update `frontend/src/components/player/AudioPlayer.tsx`: remove the horizontal volume `Slider` (line ~74); render `<VolumeControl volume={volume} onVolume={onVolume} />` in the transport area (contract A1–A2) (depends on T003, T004)
- [x] T006 [US1] Verify `frontend/src/pages/NowPlayingPage.tsx` still passes `volume={player.volume}` and `onVolume={player.setVolume}` through `AudioPlayer` with no other volume UI (FR-001, FR-005)

**Checkpoint**: MVP — volume adjustable from Now Playing page via icon + vertical slider only.

---

## Phase 4: User Story 2 - Adjust volume from the header Now Playing widget (Priority: P2)

**Goal**: Same volume control inside the open header playback panel beside previous / play-pause / next; panel close closes an open volume popover.

**Independent Test**: With a track loaded, open header panel → sound icon visible with transport controls; adjust volume; close panel → slider closes; open Now Playing volume → same level.

### Implementation for User Story 2

- [x] T007 [US2] Extend `frontend/src/components/layout/NowPlayingControlPanel.tsx`: add `volume` and `onVolume` props; render `VolumeControl` in the control row with previous / play-pause / next; pass `forceClosed={!open}` or rely on panel unmount when `open=false` (FR-003, FR-003a, FR-003b, contract P1–P3) (depends on T003)
- [x] T008 [US2] Update `frontend/src/components/layout/NowPlayingNav.tsx`: read `volume` and `setVolume` from `usePlayer()` (player context) and pass into `NowPlayingControlPanel` (contract N1) (depends on T007)

**Checkpoint**: Header and Now Playing page share one volume level; header volume only when panel is open.

---

## Phase 5: User Story 3 - Understand volume state at a glance (Priority: P3)

**Goal**: Users see muted vs sound-on icon state without opening the slider; open slider thumb matches level.

**Independent Test**: Set volume to 0 on either surface → muted icon; raise above 0 → sound-on icon; open slider → thumb matches level.

### Implementation for User Story 3

- [x] T009 [US3] Validate icon and slider sync in `frontend/src/components/player/VolumeControl.tsx`: at `volume === 0` show muted icon; at any `volume > 0` show sound-on only; slider value `volume * 100` when popover open (FR-010, contract V6–V8, spec US3) (depends on T004; adjust if gaps found during US1/US2 QA)

**Checkpoint**: Icon state and slider position are consistent on both surfaces.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, regression tests, manual validation.

- [x] T010 [P] Keyboard verification on `frontend/src/components/player/VolumeControl.tsx`: Tab to trigger, Space/Enter opens popover, slider adjustable, Escape/outside dismiss (FR-008, SC-006)
- [x] T011 [P] Update `frontend/tests/unit/NowPlayingControlPanel.test.tsx` for `volume`/`onVolume` props and presence of volume control when `open=true` (optional)
- [x] T012 [P] Add `frontend/tests/unit/VolumeControl.test.tsx` covering popover toggle, `onVolume` calls, and icon at 0 vs >0 (optional)
- [x] T013 Run quickstart manual checklist in `specs/016-volume-icon-slider/quickstart.md` (both surfaces, panel-close behavior, persistence)
- [x] T014 Confirm no layout shift when opening/closing volume popover on header and Now Playing page (FR-009, SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational (T003–T004)
- **US2 (Phase 4)**: Depends on Foundational; independently testable after US1 is not required but shares `VolumeControl`
- **US3 (Phase 5)**: Depends on T004; can overlap with US2 verification
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

| Story | Depends on | Can start after |
|-------|------------|-----------------|
| US1 (P1) | Foundational | T004 complete |
| US2 (P2) | Foundational | T004 complete (parallel with US1 after T004) |
| US3 (P3) | T004 (icon logic) | US1/US2 recommended for integration QA |

### Within Each User Story

- Foundational `VolumeControl` before any integration
- `AudioPlayer` (US1) before header wiring (US2) is recommended for faster MVP, not strictly required

### Parallel Opportunities

- **T001** and **T002** can run in parallel
- After **T004**: **T005–T006** [US1] and **T007–T008** [US2] can run in parallel (different files)
- **T010**, **T011**, **T012** in Polish can run in parallel

---

## Parallel Example: After Foundational

```bash
# Developer A — Now Playing page
T005: AudioPlayer.tsx
T006: NowPlayingPage.tsx verify

# Developer B — Header panel (after T004)
T007: NowPlayingControlPanel.tsx
T008: NowPlayingNav.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: User Story 1 (T005–T006)
4. **STOP and VALIDATE**: quickstart “Now Playing page” section
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → shared `VolumeControl` ready
2. US1 → Now Playing volume UX (MVP)
3. US2 → Header panel parity
4. US3 → Icon/slider sync validation
5. Polish → a11y, tests, full quickstart

### Parallel Team Strategy

1. Team completes T003–T004 together
2. Split US1 vs US2 across developers
3. US3 + Polish after integration smoke test

---

## Notes

- Do not add new npm packages; use existing Radix Popover and shadcn `Slider` per `research.md`
- Volume persistence stays in `frontend/src/hooks/use-player.ts` — no changes required unless wiring issues found
- Header volume MUST NOT appear when `NowPlayingControlPanel` `open=false` (FR-003a)
