import { create } from "zustand";
import { getItem, setItem, StorageKeys } from "@/lib/local-storage";

type LosslessPlaybackPreference = { enabled: boolean };

export interface LosslessPrefsStore {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

function readPrefs(): LosslessPlaybackPreference {
  return getItem<LosslessPlaybackPreference>(StorageKeys.losslessPlayback, { enabled: true });
}

/** Re-read prefs from localStorage (for tests). */
export function hydrateLosslessPrefsFromStorage(): void {
  useLosslessPrefs.setState(readPrefs());
}

export const useLosslessPrefs = create<LosslessPrefsStore>((set) => ({
  ...readPrefs(),

  setEnabled(enabled: boolean) {
    setItem(StorageKeys.losslessPlayback, { enabled });
    set({ enabled });
  },
}));

/** Read live lossless preference (for non-React callers). */
export function isLosslessEnabled(): boolean {
  return useLosslessPrefs.getState().enabled;
}
