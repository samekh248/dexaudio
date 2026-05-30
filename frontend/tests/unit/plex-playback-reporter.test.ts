import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Track } from "@dexaudio/shared-types";
import {
  _getActiveSessionKey,
  _resetReporterState,
  onPlaybackPlay,
  onTrackWillChange,
  refreshPlexReportingGate,
  setPlexReportingEnabled,
} from "@/lib/plex-playback-reporter.js";

vi.mock("@/services/api-client.js", () => ({
  api: {
    getPlexConnection: vi.fn().mockResolvedValue({ connected: true }),
    getSettings: vi.fn().mockResolvedValue({ plexPlaybackReporting: { enabled: true } }),
    postPlexTimeline: vi.fn().mockResolvedValue(undefined),
  },
}));

const track: Track = {
  id: "123",
  title: "Test",
  artist: "Artist",
  album: "Album",
  durationMs: 200000,
  format: "mp3",
};

describe("plex-playback-reporter", () => {
  beforeEach(async () => {
    _resetReporterState();
    setPlexReportingEnabled(true);
    const { api } = await import("@/services/api-client.js");
    vi.mocked(api.postPlexTimeline).mockClear();
  });

  it("rotates session key when a new track plays", async () => {
    await refreshPlexReportingGate();
    onPlaybackPlay(track, 0);
    const first = _getActiveSessionKey();
    expect(first).not.toBeNull();

    await onTrackWillChange({ ...track, id: "456" });
    onPlaybackPlay({ ...track, id: "456" }, 0);
    const second = _getActiveSessionKey();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });

  it("does not report when disabled", async () => {
    const { api } = await import("@/services/api-client.js");
    setPlexReportingEnabled(false);
    onPlaybackPlay(track, 0);
    expect(api.postPlexTimeline).not.toHaveBeenCalled();
  });

  it("skips non-numeric Plex rating keys", async () => {
    const { api } = await import("@/services/api-client.js");
    await refreshPlexReportingGate();
    onPlaybackPlay({ ...track, id: "local-file" }, 0);
    expect(api.postPlexTimeline).not.toHaveBeenCalled();
  });
});
