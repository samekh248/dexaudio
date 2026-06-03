import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaybackOutputStore } from "@/lib/playback-output-store";
import {
  getRemoteUiState,
  subscribeRemoteUi,
  teardownNetworkPlayback,
} from "@/lib/network-playback-orchestrator";

describe("network-playback-orchestrator", () => {
  beforeEach(() => {
    teardownNetworkPlayback();
    usePlaybackOutputStore.getState().clearPreference();
  });

  it("exposes default remote UI state", () => {
    const state = getRemoteUiState();
    expect(state.playing).toBe(false);
    expect(state.positionMs).toBe(0);
  });

  it("notifies remote UI subscribers", () => {
    const listener = vi.fn();
    const unsub = subscribeRemoteUi(listener);
    expect(listener).toHaveBeenCalled();
    unsub();
  });
});
