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
});
