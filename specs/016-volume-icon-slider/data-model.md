# Phase 1 Data Model: Volume Icon with Vertical Slider

**Feature**: 016-volume-icon-slider  
**Date**: 2026-05-30

No new database tables, API resources, or `shared-types` schemas. All state is **client-only**.

## Persisted entity (existing)

### Volume preference

| Field | Type | Storage | Notes |
|-------|------|---------|-------|
| `volume` | `number` | `localStorage` key `StorageKeys.volume` | Range 0–1 inclusive; default 1; written on every `setVolume` |

**Source**: `use-player.ts` → `setVolume` / initial `getItem(StorageKeys.volume, 1)`  
**Consumers**: `VolumeControl`, audio engine, staged preload engines

## Transient UI state (new)

### VolumePopoverState

Local React state inside `VolumeControl` (not global).

| Field | Type | Notes |
|-------|------|-------|
| `open` | `boolean` | Popover visibility; toggled by trigger click; closed by outside click, Escape, or parent `forceClosed` |
| `draftValue` | `number \| null` | Optional; only if implementation buffers during drag—prefer live `onVolume` per existing horizontal slider |

### VolumeControlProps (view contract)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `volume` | `number` | yes | 0–1 from `usePlayer()` |
| `onVolume` | `(v: number) => void` | yes | Calls `setVolume`; immediate engine update |
| `forceClosed` | `boolean` | no | When true, popover must not remain open (header panel dismissed) |
| `className` | `string` | no | Layout in panel vs page |

## Derived presentation

| Condition | Icon | Slider value |
|-----------|------|----------------|
| `volume === 0` | Muted/off (`VolumeX`) | 0 |
| `volume > 0` | Sound on (`Volume2`) | `volume * 100` |

## State transitions

```text
popover closed --(activate trigger)--> popover open
popover open   --(activate trigger / outside click / Escape)--> popover closed
popover open   --(drag slider)--> volume preference updated + engine volume updated (live)
header panel open=false --(unmount VolumeControl)--> popover destroyed (FR-003b)
```

## Validation rules

- **V1**: `onVolume` receives values clamped to [0, 1] (match existing `setVolume` expectations).
- **V2**: Popover must not render in a way that shifts sibling layout (absolute/portaled content only).
- **V3**: Trigger has `aria-label` "Volume"; slider has `aria-label` "Volume" or `aria-valuenow` via Radix.
- **V4**: When `forceClosed` transitions to true, `open` becomes false on next render.

## Relationships

```text
usePlayer (volume, setVolume)
    └── VolumeControl (Now Playing page + NowPlayingControlPanel)
            └── Radix Popover + shadcn Slider (vertical)
```
