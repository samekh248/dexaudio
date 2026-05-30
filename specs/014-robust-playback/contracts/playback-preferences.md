# Contract: Reactive Playback Preferences Store

Internal (frontend) contract. Makes transition/crossfade/gapless preferences reactive so changes apply on the next transition without an app reload (FR-010/SC-008). Backed by the existing `localStorage` keys; exposed via a Zustand store (no new dependency).

**File**: `frontend/src/lib/playback-prefs-store.ts`

## Persisted keys (existing — reused, not renamed)

| Key | Shape |
|-----|-------|
| `dexaudio.playback.crossfade` | `{ enabled: boolean; durationSec: number }` |
| `dexaudio.playback.gapless` | `{ enabled: boolean }` |

These remain the persistence format for backward compatibility with existing users' settings.

## Derived preference model

```ts
export type TransitionStyle = "none" | "gapless" | "crossfade";

export type PlaybackPrefs = {
  transition: TransitionStyle;     // derived: crossfade.enabled → "crossfade";
                                   //          else gapless.enabled → "gapless"; else "none"
  crossfadeDurationSec: number;    // from crossfade.durationSec (default 3)
};

export interface PlaybackPrefsStore extends PlaybackPrefs {
  setTransition(style: TransitionStyle): void;       // writes both localStorage keys consistently
  setCrossfadeDuration(sec: number): void;
}
```

## Rules

1. `crossfade` and `gapless` are mutually exclusive. `setTransition("crossfade")` sets `crossfade.enabled = true` and `gapless.enabled = false`; `setTransition("gapless")` does the inverse; `setTransition("none")` disables both. This keeps the two legacy keys internally consistent.
2. The store hydrates from `localStorage` on init and writes through on every setter (same values existing readers like `isGaplessPlaybackEnabled()` observe, so non-migrated callers keep working).
3. Engine and controls read the live store value at transition time and re-bind effects on change — no remount required (FR-010).
4. Default when unset: `gapless` enabled (matches current `isGaplessPlaybackEnabled` default of `{ enabled: true }`), crossfade disabled, `durationSec = 3`.

## Settings UI

`PlaybackSettingsSection` writes via `setTransition` / `setCrossfadeDuration` instead of writing `localStorage` directly. The three-way control (none/gapless/crossfade) maps 1:1 to `TransitionStyle`.

## Acceptance (maps to FR-009 / FR-010 / SC-008)

- Switching transition style updates the store and the very next track transition uses the new style — verified without reloading the app.
- The two legacy localStorage keys never end up both enabled simultaneously.

## Test notes

`playback-prefs-store.test.ts`: hydrate from each legacy combination; assert `transition` derivation, mutual exclusivity on `setTransition`, write-through values, and default fallback.
