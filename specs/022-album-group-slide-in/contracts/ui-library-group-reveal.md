# UI Contract: Library Group Slide-In Reveal

**Date**: 2026-06-01  
**Feature**: 022-album-group-slide-in  
**Spec**: [../spec.md](../spec.md)

Defines user-facing group entrance behavior on the **albums library home** only. **No REST API changes.**

## Components

### `LibraryGroupReveal`

**Path**: `frontend/src/components/albums/LibraryGroupReveal.tsx`

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `groupKey` | `LibraryGroupKey` | yes | e.g. `recently-played` |
| `libraryId` | `string` | yes | Active Plex library |
| `entryCount` | `number` | yes | Carousel entries in order |
| `children` | `ReactNode` | yes | Typically `AlbumGroupRow` |

**Behavior**:
- Provides `GroupRevealContext`.
- While `preparing`: children visible to layout but container `opacity-0`, `aria-hidden`, non-interactive.
- When all entries ready → `animating` → apply entrance motion → `revealed`.
- Session skip when `${libraryId}:${groupKey}` ∈ `REVEALED_GROUP_KEYS`.

### `GroupRevealEntry`

**Path**: `frontend/src/components/albums/GroupRevealEntry.tsx`

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `index` | `number` | yes | Stagger order |
| `ready` | `boolean` | yes | From child cover/content state |
| `children` | `ReactNode` | yes | Single carousel entry root |

**Visual contract (normal motion)**:

```text
preparing:  entry invisible (parent opacity-0); cover may finish load/reveal inside
animating:  translateX(-24px)→0 + opacity 0→1; delay = index × 60ms
revealed:   static position; interactions enabled
```

**Reduced motion**: Parent applies single `library-group-reveal-fade` on row; entries have no per-index slide or stagger.

### Modified consumers

| Component | Change |
|-----------|--------|
| `LibraryGroupSection` | Wrap `children(items)` in `LibraryGroupReveal` |
| `AlbumsHomePage` | Wrap each `AlbumCard` / tile in `GroupRevealEntry` with `ready` derived from cover state |
| `AlbumCard` | Optional `onRevealCompleteChange?: (complete: boolean) => void` for group gate |
| `ArtistSpotlightTile` | Optional `onRevealCompleteChange`; ready when all stack layers terminal |
| `BrowseAllTile` | No change; parent sets `ready={true}` |
| `AlbumGroupRow` | No logic change; retains `overflow-x-auto` clipping |

**Out of scope**: `AlbumGrid`, `CategoryAlbumsPage`, search, now playing.

## Animation rules

| Condition | Group motion | Entry stagger |
|-----------|--------------|---------------|
| Normal, first reveal in session | Slide from left per entry | 60ms × index |
| `prefers-reduced-motion` | Shared fade on row | None |
| Session already revealed | None | None |
| Library changed | May animate again | — |

Cover art (011) MAY complete fade/bounce while group is `preparing` (invisible). No cover fade/bounce MAY begin after group slide lands (FR-002).

## Accessibility

- `preparing` / `animating` rows: `aria-busy="true"` on section until `revealed`.
- Entries MUST NOT be focusable until `revealed` (`tabIndex={-1}`, `aria-hidden` on preparing container).
- Reduced motion MUST use `@media (prefers-reduced-motion: reduce)` overrides in CSS.
- Carousel scroll region retains existing `role="region"` and label from `AlbumGroupRow`.

## CSS classes (`themes.css`)

| Class | Purpose |
|-------|---------|
| `.library-group-entry-slide` | Per-entry slide + fade (stagger via `--group-entry-index`) |
| `.library-group-reveal-fade` | Reduced-motion shared row fade |
| `@keyframes library-group-entry-slide` | -24px → 0 translateX, opacity 0 → 1 |

## Testing contract

| Test file | Covers |
|-----------|--------|
| `use-library-group-reveal.test.ts` | Phase transitions, session Set, all-ready gate |
| `LibraryGroupReveal.test.tsx` | Preparing hidden, animating classes, reduced motion |
| `AlbumsHomePage.test.tsx` (extend) | Group does not show cards until ready (mock slow covers) |
