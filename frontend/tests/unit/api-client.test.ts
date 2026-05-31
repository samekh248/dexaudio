import { describe, expect, it, vi, beforeEach } from "vitest";
import { api, ApiError } from "@/services/api-client";

describe("api client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches health", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      }),
    );
    const result = await api.health();
    expect(result.status).toBe("ok");
  });

  it("throws ApiError on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid", code: "VALIDATION_ERROR" }),
      }),
    );
    await expect(api.health()).rejects.toBeInstanceOf(ApiError);
  });

  it("uses no-store cache policy for album group requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.getAlbumGroup("lib-1", "recently-played", 10);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/library/albums/groups/recently-played?libraryId=lib-1&limit=10",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
