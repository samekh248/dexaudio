import { create } from "zustand";
import type { NetworkPlayer, PlaybackOutputPreference } from "@dexaudio/shared-types";
import { getItem, removeItem, setItem, StorageKeys } from "@/lib/local-storage";

export type PlaybackOutputStore = {
  preference: PlaybackOutputPreference;
  isNetworkMode: () => boolean;
  getNetworkClientId: () => string | null;
  selectLocal: () => void;
  selectNetwork: (player: NetworkPlayer) => void;
  hydrateFromStorage: () => void;
  clearPreference: () => void;
};

function readPreference(): PlaybackOutputPreference {
  return getItem<PlaybackOutputPreference>(StorageKeys.playbackOutput, { mode: "local" });
}

function writePreference(pref: PlaybackOutputPreference): void {
  setItem(StorageKeys.playbackOutput, pref);
}

export const usePlaybackOutputStore = create<PlaybackOutputStore>((set, get) => ({
  preference: readPreference(),
  isNetworkMode: () => get().preference.mode === "network",
  getNetworkClientId: () =>
    get().preference.mode === "network" ? get().preference.clientIdentifier : null,
  selectLocal: () => {
    const pref: PlaybackOutputPreference = { mode: "local" };
    writePreference(pref);
    set({ preference: pref });
  },
  selectNetwork: (player) => {
    const pref: PlaybackOutputPreference = {
      mode: "network",
      clientIdentifier: player.clientIdentifier,
      displayName: player.name,
      product: player.product,
    };
    writePreference(pref);
    set({ preference: pref });
  },
  hydrateFromStorage: () => set({ preference: readPreference() }),
  clearPreference: () => {
    removeItem(StorageKeys.playbackOutput);
    set({ preference: { mode: "local" } });
  },
}));

export function hydratePlaybackOutputFromStorage(): void {
  usePlaybackOutputStore.getState().hydrateFromStorage();
}

export function clearPlaybackOutputPreference(): void {
  usePlaybackOutputStore.getState().clearPreference();
}
