# Data Model: Album Group Slide-In Animation

**Date**: 2026-06-01  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

**None.** No backend, database, or shared-type package changes.

## Frontend State Model

### `GroupRevealPhase` (enum)

| Phase | Description |
|-------|-------------|
| `preparing` | Group data loaded; entries mounted invisibly; waiting for all entry `ready` signals |
| `animating` | All entries ready; staggered slide-in (or reduced-motion fade) running |
| `revealed` | Entrance complete; carousel interactive; normal hover/play behavior |

**Initial phase when session key already in `REVEALED_GROUP_KEYS`**: skip to `revealed`.

### `GroupRevealContext` (React context)

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `GroupRevealPhase` | Current group-level phase |
| `registerEntry` | `(index: number, ready: boolean) => void` | Child reports readiness |
| `entryCount` | `number` | Expected entries in carousel order |
| `prefersReducedMotion` | `boolean` | From `matchMedia` |

### Entry readiness (`GroupRevealEntry`)

| Field | Type | Description |
|-------|------|-------------|
| `index` | `number` | Stagger order (0-based, carousel order) |
| `ready` | `boolean` | Terminal state for that entry’s content |

**Derived group ready**: `entryCount > 0` and every index `0..entryCount-1` has `ready === true`.

### Session cache

| Symbol | Type | Description |
|--------|------|-------------|
| `REVEALED_GROUP_KEYS` | `Set<string>` | Keys `${libraryId}:${groupKey}` that completed slide-in this session |

Cleared when active library changes; survives in-app route changes.

### State transitions

```text
[API still loading]
  → LibraryGroupSection shows row pulse (unchanged)

[API success, session key NOT in Set]
  → preparing (carousel opacity-0, entries mount)
  → each entry: cover phases run invisibly (011)
  → all entries ready
  → animating (opacity-1, apply slide + stagger per index)
  → on animationend (last entry or container for reduced motion)
  → revealed → add key to REVEALED_GROUP_KEYS

[API success, session key IN Set]
  → revealed immediately (no preparing/animating)

[libraryId changes]
  → clear REVEALED_GROUP_KEYS (or keys for old library)

[group refetch after error]
  → new preparing cycle if key not in Set; retry success animates once
```

### Coupling to `CoverLoadPhase` (011)

| Entry type | Ready when |
|------------|------------|
| `AlbumCard` | `revealComplete` true (`revealed` \| `absent` \| `failed`) |
| `ArtistSpotlightTile` | All visible stack layers (≤3) terminal |
| `BrowseAllTile` | Always on first paint |

### Parent visibility coupling

| Group phase | Carousel container | Entry interaction |
|-------------|-------------------|-------------------|
| `preparing` | `opacity-0`, `aria-hidden`, `pointer-events-none` | Disabled |
| `animating` | Visible; slide class per entry | Disabled until `revealed` |
| `revealed` | Visible; no entrance classes | Normal |
