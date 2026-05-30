import { describe, expect, it } from "vitest";
import {
  initialPlaybackMachineState,
  reducePlaybackMachine,
  isTerminalStatus,
} from "@/lib/playback-machine";

const failure = {
  category: "network_interrupted" as const,
  recoverable: true,
  message: "fail",
  affordances: ["skip" as const],
  timestamp: new Date().toISOString(),
};

describe("playback-machine", () => {
  it("loads into loading state", () => {
    const next = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    expect(next.status).toBe("loading");
    expect(next.recovery.attempt).toBe(0);
  });

  it("transitions loading → ready → playing", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, { type: "LOADED", autoplay: false });
    expect(s.status).toBe("ready");
    s = reducePlaybackMachine(s, { type: "PLAY" });
    expect(s.status).toBe("playing");
  });

  it("handles stall → buffering → resume", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, { type: "LOADED", autoplay: true });
    s = reducePlaybackMachine(s, { type: "STALL", nowMs: 1000 });
    expect(s.status).toBe("buffering");
    s = reducePlaybackMachine(s, { type: "RESUME" });
    expect(s.status).toBe("playing");
  });

  it("enters recovering on retry", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, { type: "LOADED", autoplay: true });
    s = reducePlaybackMachine(s, { type: "STALL", nowMs: 1000 });
    s = reducePlaybackMachine(s, { type: "RETRY", nowMs: 12000 });
    expect(s.status).toBe("recovering");
    expect(s.recovery.attempt).toBe(1);
  });

  it("fails when retries exhausted", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, {
      type: "ERROR",
      recoverable: true,
      retriesLeft: false,
      failure,
    });
    expect(s.status).toBe("failed");
    expect(isTerminalStatus(s.status)).toBe(true);
  });

  it("ends naturally", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, { type: "LOADED", autoplay: true });
    s = reducePlaybackMachine(s, { type: "ENDED" });
    expect(s.status).toBe("ended");
  });

  it("cancels to idle", () => {
    let s = reducePlaybackMachine(initialPlaybackMachineState, { type: "LOAD" });
    s = reducePlaybackMachine(s, { type: "CANCEL" });
    expect(s.status).toBe("idle");
  });

  it("updates position on seek", () => {
    const s = reducePlaybackMachine(initialPlaybackMachineState, { type: "SEEK", positionMs: 5000 });
    expect(s.positionMs).toBe(5000);
  });
});
