# Contract: Supplementary Theme Rules (client-only)

**Feature**: 021-custom-themes  
**Applies to**: Advanced user themes only (not curated)

## Limits

| Limit | Value |
|-------|--------|
| Max UTF-8 size | 16_384 bytes |
| Editor UI | Single `Textarea` (monospace), shadcn |

## Allowed content

- CSS declaration blocks for selectors:
  - `:root`
  - `[data-theme="custom"]`
  - `html[data-theme="custom"]`
- Custom properties (`--*`) and appearance-related properties: `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `letter-spacing`, `box-shadow`, `opacity`, etc.

## Blocked patterns (reject Save; strip during live preview with inline warning)

Case-insensitive substring match in raw text:

- `@import`
- `url(`
- `javascript:`
- `expression(`
- `behavior:`
- `-moz-binding`
- `<script`
- `@charset`

## Injection

- Target element: `<style id="dexaudio-theme-supplement" data-theme-supplement>`
- Replace entire contents on each valid preview/save
- Remove element when switching to curated theme or non-custom mode

## Failure modes

| Event | User-visible result |
|-------|---------------------|
| Paste > 16 KB | Inline error; no preview update |
| Blocked token on Save | Save blocked; list offending pattern |
| Blocked token on preview | Apply sanitized subset; warning banner |
