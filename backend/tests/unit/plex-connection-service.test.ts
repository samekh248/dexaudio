import { describe, expect, it, vi, beforeEach } from "vitest";
import { encrypt } from "../../src/lib/crypto.js";
import * as plexClient from "../../src/services/plex/plex-client.js";
import {
  getConnectionPublic,
  resetPlexConfigCacheForTests,
} from "../../src/services/plex/plex-connection-service.js";

const TEST_SECRET = "a".repeat(32);

const mockDb = {
  select: vi.fn(),
};

describe("plex-connection-service getConnectionPublic", () => {
  beforeEach(() => {
    resetPlexConfigCacheForTests();
    vi.restoreAllMocks();
  });

  it("returns decrypt_failed when APP_SECRET cannot decrypt token", async () => {
    const wrongSecret = "b".repeat(32);
    const tokenEncrypted = encrypt("plex-token", TEST_SECRET);
    mockDb.select.mockReturnValue({
      from: () => ({
        orderBy: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "1",
                serverUrl: "http://127.0.0.1:32400",
                tokenEncrypted,
                activeLibraryIds: ["1"],
                machineIdentifier: "srv-1",
                serverName: "Home",
                accountUsername: "user",
                accountAvatarUrl: null,
                accountEmail: null,
                accountTokenEncrypted: null,
              },
            ]),
        }),
      }),
    });

    const result = await getConnectionPublic(mockDb as never, wrongSecret);
    expect(result.connected).toBe(false);
    expect(result.issue).toBe("decrypt_failed");
    expect(result.issueMessage).toContain("APP_SECRET");
  });

  it("attempts validation and reports server_unreachable when Plex is down", async () => {
    const tokenEncrypted = encrypt("plex-token", TEST_SECRET);
    mockDb.select.mockReturnValue({
      from: () => ({
        orderBy: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: "1",
                serverUrl: "http://127.0.0.1:32400",
                tokenEncrypted,
                activeLibraryIds: ["1"],
                machineIdentifier: "srv-1",
                serverName: "Home",
                accountUsername: "user",
                accountAvatarUrl: null,
                accountEmail: null,
                accountTokenEncrypted: encrypt("account-token", TEST_SECRET),
              },
            ]),
        }),
      }),
    });
    vi.spyOn(plexClient, "validateConnection").mockResolvedValue(false);
    const plexTv = await import("../../src/services/plex/plex-tv-client.js");
    vi.spyOn(plexTv, "fetchResources").mockResolvedValue([]);

    const result = await getConnectionPublic(mockDb as never, TEST_SECRET);
    expect(result.connected).toBe(true);
    expect(result.issue).toBe("server_unreachable");
  });
});
