import { beforeEach, describe, expect, it, vi } from "vitest";
import { dropExpired } from "../../src/services/lastfm/scrobble-outbox.js";
import { scrobbleOutbox } from "../../src/db/schema.js";

describe("scrobble-outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dropExpired only targets pending rows", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const db = { update } as never;

    await dropExpired(db);

    expect(update).toHaveBeenCalledWith(scrobbleOutbox);
    expect(set).toHaveBeenCalledWith({ status: "dropped" });
    expect(where).toHaveBeenCalled();
  });
});
