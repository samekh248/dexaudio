import { describe, expect, it } from "vitest";
import {
  backoffForAttempt,
  retriesRemaining,
  RECOVERY_POLICY,
} from "@/lib/recovery-policy";
import { reducePlaybackMachine, initialPlaybackMachineState } from "@/lib/playback-machine";

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
});
