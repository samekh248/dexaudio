import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  recoverStaleSync,
  runIncrementalSync,
  SYNC_STALE_MS,
} from "../../src/services/lastfm/lastfm-sync-service.js";
import * as readClient from "../../src/services/lastfm/lastfm-read-client.js";

vi.mock("../../src/services/lastfm/lastfm-read-client.js", () => ({
  fetchAllRecentTracks: vi.fn(),
  getRecentTracksPage: vi.fn(),
  getUserPlaycount: vi.fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
  PAGE_DELAY_MS: 250,
}));

const accountId = "acc-1";
const username = "testuser";
const apiKey = "key";

function mockDb(account: Record<string, unknown> | null) {
  const updateSet = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  const update = vi.fn().mockReturnValue({ set: updateSet });
  const limit = vi.fn().mockResolvedValue(account ? [account] : []);
  const selectWhere = vi.fn().mockReturnValue({ limit });
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere, limit });
  const select = vi.fn().mockReturnValue({ from: selectFrom });
  const insertValues = vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  });
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  return {
    db: { select, update, insert } as never,
    update,
    updateSet,
  };
}

describe("lastfm-sync-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips incremental sync when account is disconnected", async () => {
    const { db, update } = mockDb({
      id: accountId,
      connected: false,
      syncStatus: "idle",
    });

    await runIncrementalSync(db, apiKey, accountId, username, null);

    expect(update).not.toHaveBeenCalled();
    expect(readClient.getRecentTracksPage).not.toHaveBeenCalled();
  });

  it("skips incremental sync when account is already syncing", async () => {
    const { db, update } = mockDb({
      id: accountId,
      connected: true,
      syncStatus: "syncing",
    });

    await runIncrementalSync(db, apiKey, accountId, username, null);

    expect(update).not.toHaveBeenCalled();
    expect(readClient.getRecentTracksPage).not.toHaveBeenCalled();
  });

  it("updates lastSyncedAt from fetched tracks page by page", async () => {
    const newest = new Date("2026-05-31T18:00:00Z");
    const { db, updateSet } = mockDb({
      id: accountId,
      connected: true,
      syncStatus: "idle",
    });

    vi.mocked(readClient.getRecentTracksPage).mockResolvedValue({
      tracks: [
        {
          track: "Song",
          artist: "Artist",
          album: "Album",
          playedAt: newest,
          artistMbid: null,
          albumMbid: null,
          imageUrl: null,
        },
      ],
      page: 1,
      totalPages: 1,
    });

    const lastSyncedAt = new Date("2026-05-30T12:00:00Z");
    await runIncrementalSync(db, apiKey, accountId, username, lastSyncedAt);

    expect(readClient.getRecentTracksPage).toHaveBeenCalledWith(apiKey, username, 1, {
      from: Math.floor(lastSyncedAt.getTime() / 1000),
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        syncStatus: "idle",
        lastSyncedAt: newest,
        syncStartedAt: null,
      }),
    );
  });

  it("marks stale syncing accounts as errored", async () => {
    const staleStart = new Date(Date.now() - SYNC_STALE_MS - 1000);
    const { db, updateSet } = mockDb({
      id: accountId,
      connected: true,
      syncStatus: "syncing",
      syncStartedAt: staleStart,
    });

    const recovered = await recoverStaleSync(db);

    expect(recovered).toBe(true);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        syncStatus: "error",
        syncStartedAt: null,
        lastError: expect.stringContaining("timed out"),
      }),
    );
  });

  it("does not recover a sync that started recently", async () => {
    const { db, updateSet } = mockDb({
      id: accountId,
      connected: true,
      syncStatus: "syncing",
      syncStartedAt: new Date(),
    });

    const recovered = await recoverStaleSync(db);

    expect(recovered).toBe(false);
    expect(updateSet).not.toHaveBeenCalled();
  });
});
