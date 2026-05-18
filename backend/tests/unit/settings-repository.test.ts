import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSettings, patchSettings } from "../../src/services/settings/settings-repository.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

describe("settings repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("returns defaults when empty", async () => {
    const settings = await getSettings(mockDb as never);
    expect(settings.matchingStrictness).toBe("fuzzy");
  });

  it("patches settings", async () => {
    await patchSettings(mockDb as never, { autoQueueSimilar: false });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("skips undefined patch values", async () => {
    await patchSettings(mockDb as never, { autoQueueSimilar: undefined });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
