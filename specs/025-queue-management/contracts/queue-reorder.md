# Contract: Queue Reorder (Upcoming Only)

Internal contract for drag and keyboard reorder in `QueuePanel` + `playback-queue-store`.

## Store API

```ts
// playback-queue-store.ts
reorderUpcoming(from: number, to: number): void;
```

**Preconditions** (MUST throw or no-op in dev guard):

- `playbackStarted && currentIndex >= 0`
- `from > currentIndex && to > currentIndex`
- `from !== to`
- `0 <= from, to < items.length`

**Postconditions**:

- `currentIndex` unchanged
- `items` order updated; persistence scheduled (existing `schedulePersist`)
- Player bridge notified via existing `onQueueStateChange` → prep retarget

## UI API (`QueuePanel.tsx`)

```ts
interface QueuePanelProps {
  sections: QueueDisplaySections; // from queue-display
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorderUpcoming: (from: number, to: number) => void;
}
```

## Pointer drag (HTML5)

| Event | Behavior |
|-------|----------|
| `dragstart` | Only if `index > currentIndex`; set `dataTransfer` with `fromIndex` |
| `dragover` | `preventDefault`; highlight drop target among upcoming rows |
| `drop` | `onReorderUpcoming(from, to)` |
| Current row | `draggable={false}` |
| Played rows | `draggable={false}` |

## Touch

- `pointerdown` + 400 ms hold → enter drag mode (same as pointer drag).
- `touch-action: none` on upcoming rows during drag.

## Keyboard (WCAG)

On focused upcoming row:

| Key | Action |
|-----|--------|
| `Alt+ArrowUp` | Move row up among upcoming (if `index > currentIndex + 1`) |
| `Alt+ArrowDown` | Move row down among upcoming (if not last) |

Announce via `aria-live="polite"` on reorder.

## Integration test scenarios

1. Four-track queue, current at index 1 — drag index 3 to index 2 → order updates, index 1 still current.
2. Attempt drag on current → no `dragstart`.
3. Attempt drag on played visible row → rejected.
