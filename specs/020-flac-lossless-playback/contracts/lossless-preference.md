# Contract: Lossless Playback Preference (client)

A client-only preference persisted in `localStorage`. No server endpoint (consistent with other playback prefs such as gapless/crossfade).

## Storage

- **Key**: `dexaudio.playback.lossless` (via `StorageKeys.losslessPlayback`).
- **Shape**: `{ "enabled": boolean }`
- **Default**: `{ "enabled": true }` (default ON — clarification Q4).
- **Read fallback**: any missing/corrupt value resolves to `{ enabled: true }`.

## Store API (`frontend/src/lib/lossless-prefs-store.ts`)

```ts
interface LosslessPrefsStore {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

// Non-React accessor for use in use-player.ts / pre-cache / pin services:
export function isLosslessEnabled(): boolean;
```

## Behavior contract

| Given | When | Then |
|-------|------|------|
| First run, no stored value | App reads preference | `enabled === true` |
| `enabled = false` | FLAC track plays | Stream requested without `quality=lossless`; transcoded as today |
| `enabled = true`, capable browser | FLAC track plays | Stream requested with `quality=lossless`; lossless delivered |
| `enabled = true`, incapable browser | FLAC track plays | No lossless request; transcoded; not re-attempted for this environment |
| Toggle changed mid-playback | Current track playing | Current playback unaffected; new value applies at next load |
| App reopened | Preference read | Last saved value persists |

## Capability helper (`frontend/src/lib/audio-capability.ts`)

```ts
export function canPlayLossless(format: TrackFormat): boolean;
// true only when format ∈ {"flac","alac"} AND the browser's
// HTMLAudioElement.canPlayType reports decode support.
```

## Tests

1. Default read with empty storage → `enabled === true`.
2. `setEnabled(false)` persists and re-reads as `false`.
3. Corrupt JSON in key → falls back to `true`.
4. `canPlayLossless("mp3")` → `false`; `canPlayLossless("flac")` → mirrors `canPlayType` result.
