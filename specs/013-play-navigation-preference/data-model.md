# Data Model: Play Navigation Preference

## Overview

No PostgreSQL schema changes. One **client-side preference** read by `usePlayNow` and edited in Settings → Playback.

---

### 1. PlayNavigationMode (`localStorage`)

| Value | Meaning |
|-------|---------|
| `"navigate"` | After play-now via hook, route to `/now-playing` |
| `"stay"` | After play-now via hook, leave current route unchanged |

| Field | Type | Default | Storage key |
|-------|------|---------|-------------|
| `mode` | `"navigate" \| "stay"` | `"navigate"` | `dexaudio.playback.playNavigation` |

**Validation**: Accept only `"navigate"` or `"stay"`; otherwise fallback `"navigate"`.

---

### 2. PlaybackSettings (client aggregate — extended)

| Field | Type | Source key | Notes |
|-------|------|------------|-------|
| `playNavigation` | `PlayNavigationMode` | `StorageKeys.playNavigation` | New |
| *(other playback prefs)* | — | — | Unchanged |

---

### 3. Play-now action (behavioral — via `usePlayNow`)

| Step | `navigate` mode | `stay` mode |
|------|-----------------|-------------|
| 1. Replace queue | `playback-queue-store.playNow(tracks)` | same |
| 2. Route change | `navigate("/now-playing")` | skipped |
| 3. User feedback | *(none beyond existing)* | audio + header visualizer only; **no toast** (FR-009) |
| 4. Playback start | `PlayerProvider` reacts to queue | same |

**In scope**: Any current/future caller of `usePlayNow`.

**Out of scope**: `addToQueue`, queue `setIndex`, header/manual navigation, **`bootstrapPlaybackSession` on reload** (FR-010).

---

## State Transitions

| Event | Effect |
|-------|--------|
| User selects **Stay on current page** | Next play-now via hook skips navigation |
| User selects **Go to Now Playing** | Next play-now navigates as today |
| Preference changed mid-session | Applies to next play-now only |
| App reload with saved session | Queue/audio may restore; **route unchanged** regardless of preference |
| App reload (preference key) | Last saved mode restored from localStorage |
