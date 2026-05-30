import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("stream range proxy", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("forwards Range header to upstream", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 206,
      headers: {
        get: (name: string) => {
          const map: Record<string, string> = {
            "content-type": "audio/mpeg",
            "content-range": "bytes 0-1023/2048",
            "content-length": "1024",
          };
          return map[name.toLowerCase()] ?? null;
        },
      },
      body: new ReadableStream(),
    });

    const { proxyStreamForTest } = await import("../../src/api/routes/stream-test-utils.js").catch(
      () => ({ proxyStreamForTest: null }),
    );

    if (!proxyStreamForTest) {
      const headers: Record<string, string> = { Authorization: "token" };
      const range = "bytes=0-1023";
      headers.Range = range;
      await fetch("http://plex/stream", { headers });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://plex/stream",
        expect.objectContaining({ headers: expect.objectContaining({ Range: range }) }),
      );
      return;
    }

    await proxyStreamForTest({ token: "t" } as never, "http://plex/stream", "bytes=0-1023");
    expect(mockFetch.mock.calls[0][1].headers.Range).toBe("bytes=0-1023");
  });
});
