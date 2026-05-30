import { beforeEach, describe, expect, it } from "vitest";
import { usePlaybackPrefs, hydratePlaybackPrefsFromStorage } from "@/lib/playback-prefs-store";
import { getItem, StorageKeys } from "@/lib/local-storage";

describe("playback-prefs-store", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlaybackPrefs.setState({
      transition: "gapless",
      crossfadeDurationSec: 3,
    });
  });

  it("defaults to gapless when unset", () => {
    localStorage.clear();
    hydratePlaybackPrefsFromStorage();
    const prefs = usePlaybackPrefs.getState();
    expect(prefs.transition).toBe("gapless");
    expect(prefs.crossfadeDurationSec).toBe(3);
  });

  it("derives crossfade when crossfade enabled", () => {
    localStorage.setItem(
      StorageKeys.crossfade,
      JSON.stringify({ enabled: true, durationSec: 5 }),
    );
    localStorage.setItem(StorageKeys.gaplessPlayback, JSON.stringify({ enabled: false }));
    hydratePlaybackPrefsFromStorage();
    expect(usePlaybackPrefs.getState().transition).toBe("crossfade");
    expect(usePlaybackPrefs.getState().crossfadeDurationSec).toBe(5);
  });

  it("setTransition enforces mutual exclusivity", () => {
    usePlaybackPrefs.getState().setTransition("crossfade");
    expect(getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 }).enabled).toBe(true);
    expect(getItem(StorageKeys.gaplessPlayback, { enabled: true }).enabled).toBe(false);
    expect(usePlaybackPrefs.getState().transition).toBe("crossfade");

    usePlaybackPrefs.getState().setTransition("gapless");
    expect(getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 }).enabled).toBe(false);
    expect(getItem(StorageKeys.gaplessPlayback, { enabled: true }).enabled).toBe(true);

    usePlaybackPrefs.getState().setTransition("none");
    expect(getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 }).enabled).toBe(false);
    expect(getItem(StorageKeys.gaplessPlayback, { enabled: true }).enabled).toBe(false);
  });

  it("setCrossfadeDuration writes through to localStorage", () => {
    usePlaybackPrefs.getState().setCrossfadeDuration(7);
    expect(getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 }).durationSec).toBe(7);
    expect(usePlaybackPrefs.getState().crossfadeDurationSec).toBe(7);
  });
});
