# Contract: Playback Output UI

**Date**: 2026-06-03  
**Surface**: Now Playing chrome + optional header control

## Overview

User-facing output selector and status messaging. Implemented with shadcn/ui primitives (Constitution II).

---

## Output selector

**Location**: Now Playing page toolbar (primary); optional compact entry in app header.

**Contents**:

| Entry | Behavior |
|-------|----------|
| **This device** | Sets `PlaybackOutputPreference.mode = local` |
| **{name} — {product}** | One row per `GET /plex/players` result where `reachable` |

**States**:

- Loading: skeleton rows (≤10 s timeout → error)
- Empty: only “This device” + inline help linking to enable remote control on Plex players
- Refresh: icon button triggers `GET /plex/players?refresh=true`

**Accessibility** (WCAG 2.1 AA):

- `role="radiogroup"` with `aria-label="Playback output"`
- Each option: `role="radio"` + `aria-checked`
- Keyboard: arrow keys move selection; Enter confirms

---

## Switch to local

When user selects **This device** while network player is playing:

1. Call `POST .../switch-away` (stop remote).
2. Set preference to `local`.
3. Do not start Howler until user presses play (no auto-local audible).

---

## Error surfaces

| Scenario | UI |
|----------|-----|
| Player offline on play | Toast + actions: Retry, Switch to This device, Refresh players |
| Queue sync failed | Toast; badge on queue panel “Remote sync issue” |
| Unsupported seek | Disable seek slider; tooltip “Not supported on {product}” |
| Degraded queue mode | Non-blocking banner: “Limited queue sync on this player” |

---

## Plex reporting indicator

When `mode=network`, Plex Settings status shows **“Reporting handled by {player name}”** (informational; toggle disabled or footnote only—no DexAudio timeline).
