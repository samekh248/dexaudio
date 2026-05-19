import { describe, expect, it } from "vitest";
import { compareAlbumTitles, sortKeyForTitle } from "@/lib/album-sort";

describe("frontend album-sort parity", () => {
  it('strips "The " for sort key', () => {
    expect(sortKeyForTitle("The Wall")).toBe("wall");
    expect(sortKeyForTitle("Abbey Road")).toBe("abbey road");
  });

  it("does not strip An", () => {
    expect(sortKeyForTitle("An Innocent Man")).toBe("an innocent man");
  });

  it("orders titles consistently", () => {
    expect(compareAlbumTitles("Abbey Road", "The Wall")).toBeLessThan(0);
  });
});
