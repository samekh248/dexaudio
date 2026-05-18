import { describe, expect, it } from "vitest";
import { isPinned, pinTarget, unpinTarget } from "@/lib/pin-service";

describe("pin service", () => {
  it("tracks pins by type and id", () => {
    pinTarget({ type: "album", id: "123" });
    expect(isPinned({ type: "album", id: "123" })).toBe(true);
    unpinTarget({ type: "album", id: "123" });
    expect(isPinned({ type: "album", id: "123" })).toBe(false);
  });
});
