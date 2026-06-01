import { beforeEach, describe, expect, it, vi } from "vitest";
import { decrypt } from "../../src/lib/crypto.js";
import {
  dropExpired,
  enqueueScrobble,
  flushPending,
  getPendingCount,
} from "../../src/services/lastfm/scrobble-outbox.js";
import { submitScrobble } from "../../src/services/lastfm/lastfm-client.js";
import { scrobbleOutbox } from "../../src/db/schema.js";

vi.mock("../../src/lib/crypto.js", () => ({
  decrypt: vi.fn(),
}));

vi.mock("../../src/services/lastfm/lastfm-client.js", () => ({
  submitScrobble: vi.fn(),
}));

const scrobble = {
  track: "Song",
  artist: "Artist",
  album: "Album",
  playedAt: "2026-05-31T12:00:00.000Z",
};

function mockDb(opts?: {
  existingPending?: boolean;
  pendingRows?: Array<Record<string, unknown>>;
  account?: Record<string, unknown> | null;
  pendingCount?: number;
}) {
  const updateSet = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  const update = vi.fn().mockReturnValue({ set: updateSet });
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  const enqueueSelectLimit = vi.fn().mockResolvedValue(
    opts?.existingPending ? [{ id: "existing" }] : [],
  );
  const enqueueSelectWhere = vi.fn().mockReturnValue({ limit: enqueueSelectLimit });
  const enqueueSelectFrom = vi.fn().mockReturnValue({ where: enqueueSelectWhere });

  const pendingSelectWhere = vi.fn().mockReturnValue({
    orderBy: vi.fn().mockResolvedValue(opts?.pendingRows ?? []),
  });
  const pendingSelectFrom = vi.fn().mockReturnValue({ where: pendingSelectWhere });

  const countSelectWhere = vi.fn().mockResolvedValue(
    Array.from({ length: opts?.pendingCount ?? 0 }, (_, i) => ({ id: String(i) })),
  );
  const countSelectFrom = vi.fn().mockReturnValue({ where: countSelectWhere });

  const accountSelectLimit = vi.fn().mockResolvedValue(
    opts?.account ? [opts.account] : [],
  );
  const accountSelectFrom = vi.fn().mockReturnValue({ limit: accountSelectLimit });

  let selectCall = 0;
  const select = vi.fn().mockImplementation(() => {
    selectCall += 1;
    if (selectCall === 1 && opts?.existingPending !== undefined && !opts.pendingRows) {
      return { from: enqueueSelectFrom };
    }
    if (opts?.pendingRows && selectCall <= 2) {
      if (selectCall === 1) return { from: accountSelectFrom };
      return { from: pendingSelectFrom };
    }
    if (opts?.account !== undefined && selectCall === 1) {
      return { from: accountSelectFrom };
    }
    return { from: countSelectFrom };
  });

  return {
    db: { select, update, insert } as never,
    insert,
    insertValues,
    updateSet,
  };
}

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

  it("enqueueScrobble inserts a new pending row", async () => {
    const { db, insert, insertValues } = mockDb({ existingPending: false });

    await enqueueScrobble(db, scrobble);

    expect(insert).toHaveBeenCalledWith(scrobbleOutbox);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        trackTitle: scrobble.track,
        artist: scrobble.artist,
        album: scrobble.album,
        status: "pending",
      }),
    );
  });

  it("enqueueScrobble skips duplicate pending rows", async () => {
    const { db, insert } = mockDb({ existingPending: true });

    await enqueueScrobble(db, scrobble);

    expect(insert).not.toHaveBeenCalled();
  });

  it("getPendingCount returns pending row count", async () => {
    const db = mockDb({ pendingCount: 2 }).db;

    await expect(getPendingCount(db)).resolves.toBe(2);
  });

  it("flushPending no-ops without Last.fm credentials", async () => {
    const db = mockDb({ pendingCount: 3 }).db;

    const result = await flushPending(db, { appSecret: "secret" });

    expect(result).toEqual({ delivered: 0, pending: 3 });
    expect(submitScrobble).not.toHaveBeenCalled();
  });

  it("flushPending no-ops when account is disconnected", async () => {
    const db = mockDb({
      account: { connected: false, sessionKeyEncrypted: Buffer.from("x") },
      pendingCount: 1,
    }).db;

    const result = await flushPending(db, {
      apiKey: "key",
      apiSecret: "secret",
      appSecret: "app-secret",
    });

    expect(result).toEqual({ delivered: 0, pending: 1 });
    expect(submitScrobble).not.toHaveBeenCalled();
  });

  it("flushPending no-ops when session key cannot be decrypted", async () => {
    vi.mocked(decrypt).mockImplementation(() => {
      throw new Error("bad key");
    });
    const db = mockDb({
      account: { connected: true, sessionKeyEncrypted: Buffer.from("x") },
      pendingCount: 2,
    }).db;

    const result = await flushPending(db, {
      apiKey: "key",
      apiSecret: "secret",
      appSecret: "app-secret",
    });

    expect(result).toEqual({ delivered: 0, pending: 2 });
    expect(submitScrobble).not.toHaveBeenCalled();
  });

  it("flushPending delivers scrobbles and marks submitted rows", async () => {
    vi.mocked(decrypt).mockReturnValue("session-key");
    vi.mocked(submitScrobble).mockResolvedValue(true);

    const pendingRow = {
      id: "row-1",
      trackTitle: "Song",
      artist: "Artist",
      album: "Album",
      playedAt: new Date("2026-05-31T12:00:00.000Z"),
      retryCount: 0,
      status: "pending" as const,
      expiresAt: new Date(),
    };

    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    const accountSelectLimit = vi.fn().mockResolvedValue([
      { connected: true, sessionKeyEncrypted: Buffer.from("enc") },
    ]);
    const pendingSelectWhere = vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([pendingRow]),
    });
    const countSelectWhere = vi.fn().mockResolvedValue([]);

    let selectCall = 0;
    const select = vi.fn().mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) return { from: vi.fn().mockReturnValue({ limit: accountSelectLimit }) };
      if (selectCall === 2) return { from: vi.fn().mockReturnValue({ where: pendingSelectWhere }) };
      return { from: vi.fn().mockReturnValue({ where: countSelectWhere }) };
    });

    const db = { select, update } as never;

    const result = await flushPending(db, {
      apiKey: "key",
      apiSecret: "secret",
      appSecret: "app-secret",
    });

    expect(submitScrobble).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith({ status: "submitted" });
    expect(result).toEqual({ delivered: 1, pending: 0 });
  });

  it("flushPending increments retry count when submission fails", async () => {
    vi.mocked(decrypt).mockReturnValue("session-key");
    vi.mocked(submitScrobble).mockResolvedValue(false);

    const pendingRow = {
      id: "row-1",
      trackTitle: "Song",
      artist: "Artist",
      album: "Album",
      playedAt: new Date("2026-05-31T12:00:00.000Z"),
      retryCount: 2,
      status: "pending" as const,
      expiresAt: new Date(),
    };

    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    const accountSelectLimit = vi.fn().mockResolvedValue([
      { connected: true, sessionKeyEncrypted: Buffer.from("enc") },
    ]);
    const pendingSelectWhere = vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([pendingRow]),
    });
    const countSelectWhere = vi.fn().mockResolvedValue([pendingRow]);

    let selectCall = 0;
    const select = vi.fn().mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) return { from: vi.fn().mockReturnValue({ limit: accountSelectLimit }) };
      if (selectCall === 2) return { from: vi.fn().mockReturnValue({ where: pendingSelectWhere }) };
      return { from: vi.fn().mockReturnValue({ where: countSelectWhere }) };
    });

    const db = { select, update } as never;

    const result = await flushPending(db, {
      apiKey: "key",
      apiSecret: "secret",
      appSecret: "app-secret",
    });

    expect(updateSet).toHaveBeenCalledWith({ retryCount: 3 });
    expect(result).toEqual({ delivered: 0, pending: 1 });
  });
});
