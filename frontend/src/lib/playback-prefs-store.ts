import { create } from "zustand";
import type { TransitionStyle } from "@dexaudio/shared-types";
import { getItem, setItem, StorageKeys } from "@/lib/local-storage";

type CrossfadePreference = { enabled: boolean; durationSec: number };
type GaplessPreference = { enabled: boolean };

export type PlaybackPrefs = {
  transition: TransitionStyle;
  crossfadeDurationSec: number;
};

export interface PlaybackPrefsStore extends PlaybackPrefs {
  setTransition(style: TransitionStyle): void;
  setCrossfadeDuration(sec: number): void;
}

function deriveTransition(gapless: GaplessPreference, crossfade: CrossfadePreference): TransitionStyle {
  if (crossfade.enabled) return "crossfade";
  if (gapless.enabled) return "gapless";
  return "none";
}

function readPrefs(): PlaybackPrefs {
  const gapless = getItem<GaplessPreference>(StorageKeys.gaplessPlayback, { enabled: true });
  const crossfade = getItem<CrossfadePreference>(StorageKeys.crossfade, { enabled: false, durationSec: 3 });
  return {
    transition: deriveTransition(gapless, crossfade),
    crossfadeDurationSec: crossfade.durationSec,
  };
}

function writeTransition(style: TransitionStyle, crossfadeDurationSec: number): void {
  switch (style) {
    case "crossfade":
      setItem(StorageKeys.gaplessPlayback, { enabled: false });
      setItem(StorageKeys.crossfade, { enabled: true, durationSec: crossfadeDurationSec });
      break;
    case "gapless":
      setItem(StorageKeys.gaplessPlayback, { enabled: true });
      setItem(StorageKeys.crossfade, { enabled: false, durationSec: crossfadeDurationSec });
      break;
    default:
      setItem(StorageKeys.gaplessPlayback, { enabled: false });
      setItem(StorageKeys.crossfade, { enabled: false, durationSec: crossfadeDurationSec });
  }
}

/** Re-read prefs from localStorage (for tests). */
export function hydratePlaybackPrefsFromStorage(): void {
  usePlaybackPrefs.setState(readPrefs());
}

export const usePlaybackPrefs = create<PlaybackPrefsStore>((set, get) => ({
  ...readPrefs(),

  setTransition(style: TransitionStyle) {
    const duration = get().crossfadeDurationSec;
    writeTransition(style, duration);
    set({ transition: style });
  },

  setCrossfadeDuration(sec: number) {
    const crossfade = getItem<CrossfadePreference>(StorageKeys.crossfade, {
      enabled: get().transition === "crossfade",
      durationSec: sec,
    });
    setItem(StorageKeys.crossfade, { ...crossfade, durationSec: sec });
    set({ crossfadeDurationSec: sec });
  },
}));

/** Read live transition style (for non-React callers). */
export function getTransitionStyle(): TransitionStyle {
  return usePlaybackPrefs.getState().transition;
}

export function isGaplessOrCrossfadeEnabled(): boolean {
  const t = getTransitionStyle();
  return t === "gapless" || t === "crossfade";
}
