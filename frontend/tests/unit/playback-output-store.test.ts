import { beforeEach, describe, expect, it } from "vitest";
import { StorageKeys } from "@/lib/local-storage";
import {
  hydratePlaybackOutputFromStorage,
  usePlaybackOutputStore,
} from "@/lib/playback-output-store";

describe("playback-output-store", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlaybackOutputStore.getState().clearPreference();
    hydratePlaybackOutputFromStorage();
  });

  it("defaults to local output", () => {
    expect(usePlaybackOutputStore.getState().preference.mode).toBe("local");
    expect(usePlaybackOutputStore.getState().isNetworkMode()).toBe(false);
  });

  it("persists network player selection", () => {
    usePlaybackOutputStore.getState().selectNetwork({
      clientIdentifier: "amp-1",
      name: "Living Room",
      product: "Plexamp",
      reachable: true,
      supportsSeek: true,
      supportsQueueSync: true,
    });
    const raw = localStorage.getItem(StorageKeys.playbackOutput);
    expect(raw).toContain("amp-1");
    expect(usePlaybackOutputStore.getState().getNetworkClientId()).toBe("amp-1");
  });

  it("restores preference from storage on hydrate", () => {
    localStorage.setItem(
      StorageKeys.playbackOutput,
      JSON.stringify({
        mode: "network",
        clientIdentifier: "x",
        displayName: "Office",
        product: "Plexamp",
      }),
    );
    hydratePlaybackOutputFromStorage();
    expect(usePlaybackOutputStore.getState().isNetworkMode()).toBe(true);
  });
});
