import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorageKeys } from "@/lib/local-storage";
import {
  hydrateNetworkCastPrefsFromStorage,
  useNetworkCastPrefs,
} from "@/lib/network-cast-prefs-store";

vi.mock("@/lib/network-playback-orchestrator", () => ({
  selectLocalOutput: vi.fn().mockResolvedValue(undefined),
}));

describe("network-cast-prefs-store", () => {
  beforeEach(() => {
    localStorage.clear();
    hydrateNetworkCastPrefsFromStorage();
  });

  it("defaults network cast to enabled", () => {
    expect(useNetworkCastPrefs.getState().enabled).toBe(true);
  });

  it("persists disabled preference", () => {
    useNetworkCastPrefs.getState().setEnabled(false);
    expect(useNetworkCastPrefs.getState().enabled).toBe(false);
    const raw = localStorage.getItem(StorageKeys.networkCastEnabled);
    expect(raw).toContain('"enabled":false');
  });
});
