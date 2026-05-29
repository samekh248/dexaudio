# UI Contract: Album Cover Reveal

**Date**: 2026-05-29  
**Feature**: 011-album-cover-load-animation  
**Spec**: [../spec.md](../spec.md)

This document defines user-facing cover load/reveal behavior for albums library views. **No REST API changes.**

## Components

### `AlbumCoverImage`

**Path**: `frontend/src/components/albums/AlbumCoverImage.tsx`

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `artUrl` | `string \| undefined` | yes | Plex proxy URL or undefined |
| `className` | `string` | no | Applied to root slot (inside `AspectRatio`) |
| `onPhaseChange` | `(phase: CoverLoadPhase) => void` | no | Parent sync for text/overlay |

**Visual contract**:

```text
┌─────────────────┐
│  pending:       │  Empty slot — no fill, fixed 1:1 aspect
│  (invisible)    │
└─────────────────┘
        ↓ onLoad
┌─────────────────┐
│  revealing:     │  opacity 0→1 + translateY +6px→0 (bounce)
│  [cover art]    │  duration ~300ms
└─────────────────┘
        ↓ animationend
┌─────────────────┐
│  revealed:      │  static cover; hover play enabled (parent)
└─────────────────┘

absent/failed → immediate muted fallback (existing "no art" style)
```

### `PlayAlbumOverlay` (extended)

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `revealComplete` | `boolean` | `true` | When `false`, no hover visibility, `pointer-events-none` |

### Consumers

| Consumer | Cover | Text sync | Play overlay gate |
|----------|-------|-----------|-------------------|
| `AlbumCard` | `AlbumCoverImage` | Title/artist hidden until `revealed` | `revealComplete` |
| `AlbumGrid` | `AlbumCoverImage` | Same | Same |
| `ArtistSpotlightTile` | `AlbumCoverImage` per stack layer | Artist name always visible | Existing artist play button unchanged |

**Out of scope**: `BrowseAllTile`, search, now playing, album detail, queue art.

## Animation rules

| Condition | Cover motion | Text |
|-----------|--------------|------|
| Normal load complete | Fade + 6px bounce-up | Fade in sync with cover |
| `prefers-reduced-motion` | Fade only | Fade in sync |
| absent / failed URL | No animation | Immediate |
| URL already revealed this session | No animation | Immediate |

## Accessibility

- Empty slot MUST preserve aspect ratio (no CLS — SC-003).
- Hidden text during load MUST NOT be focusable; links become tabbable after reveal.
- Play overlay MUST remain absent from accessibility tree until `revealComplete` (or use `aria-hidden` + no pointer events).
- Reduced motion MUST honor OS setting via CSS media query.

## CSS classes (themes.css)

| Class | Purpose |
|-------|---------|
| `.album-cover-reveal` | Full fade + bounce animation |
| `.album-cover-reveal--fade-only` | Opacity only (reduced motion) |
| `.album-cover-reveal-sync` | Same fade timing for title/artist text |

```css
@media (prefers-reduced-motion: reduce) {
  .album-cover-reveal {
    animation-name: album-cover-fade-in; /* no translate */
  }
}
```
