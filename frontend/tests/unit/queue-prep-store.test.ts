import { beforeEach, describe, expect, it } from "vitest";
import { clearAllExcept, setTrackPrep, useQueuePrepStore } from "@/lib/queue-prep-store";

describe("queue-prep-store", () => {
  beforeEach(() => {
    useQueuePrepStore.setState({ byTrackId: {} });
  });

  it("tracks prep status per track id", () => {
    setTrackPrep("a", { status: "loading", progressRatio: 0.5 });
    expect(useQueuePrepStore.getState().byTrackId.a).toEqual({
      status: "loading",
      progressRatio: 0.5,
    });
    setTrackPrep("a", { status: "ready", progressRatio: 1 });
    expect(useQueuePrepStore.getState().byTrackId.a?.status).toBe("ready");
  });

  it("clearAllExcept removes stale entries", () => {
    setTrackPrep("a", { status: "ready", progressRatio: 1 });
    setTrackPrep("b", { status: "loading", progressRatio: 0.2 });
    clearAllExcept(["a"]);
    expect(useQueuePrepStore.getState().byTrackId.a).toBeDefined();
    expect(useQueuePrepStore.getState().byTrackId.b).toBeUndefined();
  });
});
