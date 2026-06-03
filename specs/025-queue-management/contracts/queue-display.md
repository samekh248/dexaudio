# Contract: Queue List Display Segmentation

UI contract for `QueuePanel` and `queue-display.ts`. Internal frontend only.

## Inputs

```ts
interface QueueDisplayInput {
  items: QueueItem[];
  currentIndex: number;       // -1 if not started
  playbackStarted: boolean;
}
```

## Pure API (`frontend/src/lib/queue-display.ts`)

```ts
const PLAYED_VISIBLE_MAX = 3;

interface QueueDisplaySections {
  played: Array<{ item: QueueItem; index: number }>;
  current: { item: QueueItem; index: number } | null;
  upcoming: Array<{ item: QueueItem; index: number }>;
  showPlayedSeparator: boolean;
}

export function buildQueueDisplaySections(input: QueueDisplayInput): QueueDisplaySections;
```

## Rules

| Given | Then |
|-------|------|
| `!playbackStarted` or `currentIndex < 0` | `played` empty; `current` null; `upcoming` = all items with original indices |
| `currentIndex >= 0` | `current` = item at `currentIndex` |
| `currentIndex > 0` | `played` = indices in `[max(0, current-3), current)` inclusive of start, exclusive of current |
| `currentIndex === 0` | `played` empty |
| `showPlayedSeparator` | `true` when `played.length > 0` |

## Row chrome

| Section | Remove button | Drag | Select | Visual |
|---------|---------------|------|--------|--------|
| `played` | hidden | disabled | enabled → `setIndex` | subdued (`opacity`/muted) |
| `current` | visible | disabled | enabled | primary highlight (existing) |
| `upcoming` | visible | enabled | enabled | default |

## Separator

- shadcn `Separator` or bordered divider between `played` and `current/upcoming` blocks.
- Accessible label: `aria-label="Previously played"` on played region.

## `NowPlayingPage` integration

- Pass `displayIndex` only when `playbackStarted`; else `-1`.
- `onSelect(index)` → existing `setIndex` (re-anchor).
- `onRemove(index)` → existing `removeAt` (blocked in UI for played).
