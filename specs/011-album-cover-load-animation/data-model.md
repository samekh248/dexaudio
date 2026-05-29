# Data Model: Album Cover Load Animation

**Date**: 2026-05-29  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Schema Changes

**None.** No backend, database, or shared-type changes.

## Frontend State Model

### `CoverLoadPhase` (enum)

| Phase | Description |
|-------|-------------|
| `absent` | No `artUrl` — show fallback + immediate text/interactions |
| `pending` | URL present; image loading; empty slot; text hidden (album cards) |
| `revealing` | Load complete; CSS entrance animation running |
| `revealed` | Animation complete (or skipped for cache replay); interactions enabled |
| `failed` | Load error or 10s timeout — fallback + immediate text/interactions |

### `useAlbumCoverLoad` return shape

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `CoverLoadPhase` | Current load/reveal state |
| `showFallback` | `boolean` | Render muted "no art" block |
| `showEmptySlot` | `boolean` | Reserved area with no visible fill |
| `revealComplete` | `boolean` | `phase === 'revealed' \|\| phase === 'absent' \|\| phase === 'failed'` |
| `imageRef` | `RefObject<HTMLImageElement>` | For mount-time cache check |
| `imageProps` | `{ src, onLoad, onError, className }` | Spread onto hidden-then-reveal `<img>` |

### State transitions

```text
[artUrl undefined/null/""]
  → absent → showFallback=true, text immediate, play on hover

[artUrl present]
  → pending → showEmptySlot=true, img hidden, text hidden (album cards)

[img onLoad OR complete on mount]
  → revealing → apply .album-cover-reveal (or .album-cover-reveal--fade-only)
  → on animationend → revealed

[URL in session revealed Set on mount]
  → revealed (skip revealing)

[img onError OR 10s timeout]
  → failed → showFallback=true, text immediate

[artUrl changes]
  → reset to pending (new URL not in Set)

[component unmount during pending/revealing]
  → discard (no side effects)
```

### Parent visibility coupling (album cards only)

| Parent region | pending / revealing | revealed | absent / failed |
|---------------|---------------------|----------|-----------------|
| Cover slot | empty or animating | visible cover | fallback |
| Title + artist | `opacity-0` / `invisible` | visible (faded in with cover) | visible immediately |
| Play overlay | hidden (`revealComplete=false`) | hover/focus as today | hover/focus as today |

Artist spotlight tile: only stack `AlbumCoverImage` instances follow this table per layer; `CardContent` artist metadata always visible.

## Component Boundaries

| Unit | Responsibility |
|------|----------------|
| `useAlbumCoverLoad` | Phase machine, timeout, session URL Set, reduced-motion class selection |
| `AlbumCoverImage` | Aspect-ratio slot, empty/fallback/img rendering, animation class |
| `PlayAlbumOverlay` | Play button; gated by `revealComplete` prop |
| `AlbumCard` | Wire hook + sync text visibility + overlay |
| `AlbumGrid` | Same as AlbumCard per grid cell |
| `ArtistSpotlightTile` | One `AlbumCoverImage` per stack layer |

## Constants

| Constant | Value | Usage |
|----------|-------|--------|
| `COVER_LOAD_TIMEOUT_MS` | `10_000` | FR-008 fail-safe |
| `COVER_REVEAL_DURATION_MS` | `300` | Animation duration; SC-002 |
| `COVER_BOUNCE_OFFSET_PX` | `6` | Peak translateY (within 4–8px assumption) |
| `REVEALED_URL_CACHE` | `Set<string>` | Module scope; FR-011 |

## Validation Rules

- Partial images MUST NOT be visible (`opacity-0` or off-screen until `onLoad`).
- `PlayAlbumOverlay` MUST NOT receive pointer events until `revealComplete`.
- Fallback MUST match existing muted "no art" styling.
- Reduced motion MUST NOT apply transform animation on cover or text.
