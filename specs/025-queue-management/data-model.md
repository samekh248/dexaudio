# Data Model: Queue Management

**Feature**: `025-queue-management` | **Date**: 2026-06-03

## Overview

All state is **client-side** and scoped to the active listening session. No PostgreSQL or API entities. This document names logical structures used by the UI and orchestrator extensions.

## Entities

### QueueSession (existing — `playback-queue-store`)

| Field | Type | Notes |
|-------|------|-------|
| `items` | `QueueItem[]` | Ordered tracks; unchanged on played trim |
| `currentIndex` | `number` | `-1` when queue-only (not started); else 0..n-1 |
| `playbackStarted` | `boolean` | Whether a current track is selected for playback |
| `loadGeneration` | `number` | Bumped on index change / re-anchor |
| `skippedIndices` | `Set<number>` | Existing skip markers (display: passed = index &lt; current) |

**Validation**: `reorderUpcoming` only accepts `from`, `to` &gt; `currentIndex` and within `items.length`.

### QueueDisplaySlice (derived — `queue-display.ts`)

| Slice | Source indices | UI rules |
|-------|----------------|----------|
| `playedVisible` | `[max(0, current-3), current)` | Max 3 rows; read-only; selectable |
| `current` | `currentIndex` | Pinned; removable; not draggable |
| `upcoming` | `(currentIndex, length)` | Draggable; removable; buffer bars |

**Invariant**: If `!playbackStarted` or `currentIndex < 0`, no played section; all items treated as upcoming/list.

### QueuePreparationEntry (new — `queue-prep-store`)

| Field | Type | Notes |
|-------|------|-------|
| `trackId` | `string` | Key |
| `status` | `idle \| loading \| ready \| error` | For row buffer UI |
| `progressRatio` | `number \| null` | 0..1 while loading; 1 when ready |
| `updatedAt` | `number` | Epoch ms for stale eviction |

**Lifecycle**: Created when orchestrator starts `preloadForward` for a track; `ready` when staged engine fires `onLoaded`; removed when track leaves prep window or on cancel.

### QueuePrepDepthPreference (new — `playback-prefs-store`)

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| `queuePrepDepth` | `number` | `3` | Integer 1..5 (min = next only) |

**Persistence**: `localStorage` key `dexaudio.playback.queuePrepDepth` → `{ depth: number }`.

### StagedTrackPool (runtime — `use-player.ts`)

| Field | Type | Notes |
|-------|------|-------|
| `forwardByTrackId` | `Map<string, StagedPlayback>` | Max entries = `queuePrepDepth` |
| `backward` | `StagedPlayback \| null` | Unchanged single backward slot |

**Rules**: Forward pool evicts IDs not in `[current+1 .. current+depth]`; disposing calls `disposeStaged`.

## State Transitions

### Re-anchor (user selects visible played row)

```
currentIndex = k
→ playedVisible = items[k-3 .. k)
→ upcoming = items[k+1 .. end]
→ loadGeneration++
→ prep pool retargets to new next..next+depth
```

### Advance / skip forward

```
currentIndex++
→ playedVisible window slides
→ prep pool shifts forward
```

### Reorder upcoming (drag)

```
items reordered (indices > current unchanged in count)
→ currentIndex unchanged
→ prep pool recomputed within 1s
```

## Relationships

```text
QueueSession ──derives──► QueueDisplaySlice ──renders──► QueuePanel
QueuePrepDepthPreference ──limits──► StagedTrackPool
StagedTrackPool ──updates──► QueuePreparationEntry ──reads──► QueuePanel (buffer bar)
playback-orchestrator ──drives──► StagedTrackPool (via player bridge)
```
