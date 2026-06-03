import { create } from "zustand";
import { getItem, setItem, StorageKeys } from "@/lib/local-storage";
import { usePlaybackOutputStore } from "@/lib/playback-output-store";
import { selectLocalOutput } from "@/lib/network-playback-orchestrator";

type NetworkCastPreference = { enabled: boolean };

export interface NetworkCastPrefsStore {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

function readPrefs(): NetworkCastPreference {
  return getItem<NetworkCastPreference>(StorageKeys.networkCastEnabled, { enabled: true });
}

export function hydrateNetworkCastPrefsFromStorage(): void {
  useNetworkCastPrefs.setState(readPrefs());
}

export const useNetworkCastPrefs = create<NetworkCastPrefsStore>((set) => ({
  ...readPrefs(),

  setEnabled(enabled: boolean) {
    setItem(StorageKeys.networkCastEnabled, { enabled });
    set({ enabled });
    if (!enabled && usePlaybackOutputStore.getState().isNetworkMode()) {
      void selectLocalOutput();
    }
  },
}));

export function isNetworkCastEnabled(): boolean {
  return useNetworkCastPrefs.getState().enabled;
}
