import { describe, expect, it } from "vitest";
import {
  backoffForAttempt,
  retriesRemaining,
  RECOVERY_POLICY,
} from "@/lib/recovery-policy";
import { reducePlaybackMachine, initialPlaybackMachineState } from "@/lib/playback-machine";
import { isPrematureEndedPlayback, resolveEndedPositionMs } from "@/hooks/use-player";

describe("recovery flow (policy + machine)", () => {
  it("retries up to maxRetries then fails", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, { type: "LOADED", autoplay: true });

    for (let i = 0; i < RECOVERY_POLICY.maxRetries; i++) {
      expect(retriesRemaining(s.recovery.attempt)).toBe(true);
      s = reducePlaybackMachine(s, { type: "RETRY", nowMs: Date.now() });
      expect(backoffForAttempt(s.recovery.attempt)).toBeGreaterThan(0);
    }

    s = reducePlaybackMachine(s, {
      type: "ERROR",
      recoverable: true,
      retriesLeft: false,
      failure: {
        category: "network_interrupted",
        recoverable: true,
        message: "failed",
        affordances: ["skip"],
        timestamp: new Date().toISOString(),
      },
    });
    expect(s.status).toBe("failed");
  });

  it("stall triggers buffering then retry", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, { type: "LOADED", autoplay: true });
    s = reducePlaybackMachine(s, { type: "STALL", nowMs: 1000 });
    expect(s.status).toBe("buffering");
    s = reducePlaybackMachine(s, { type: "RETRY", nowMs: 12_000 });
    expect(s.status).toBe("recovering");
  });

  it("treats early ended events as premature", () => {
    expect(isPrematureEndedPlayback(45_000, 180_000)).toBe(true);
  });

  it("does not treat near-end or short tracks as premature", () => {
    expect(isPrematureEndedPlayback(177_000, 180_000)).toBe(false);
    expect(isPrematureEndedPlayback(8_000, 12_000)).toBe(false);
  });

  it("does not treat natural end as premature when Howler resets seek to 0", () => {
    const positionMs = resolveEndedPositionMs(0, 177_000);
    expect(isPrematureEndedPlayback(positionMs, 180_000)).toBe(false);
  });
});
