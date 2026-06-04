import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  clearTrackWaveformCache,
  useTrackWaveform,
} from "@/hooks/use-track-waveform";

const sampleWaveform = {
  trackId: "1",
  samples: [0.2, 0.8],
  sampleIntervalMs: 100,
  durationMs: 200000,
};

describe("useTrackWaveform", () => {
  beforeEach(() => {
    clearTrackWaveformCache();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleWaveform,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTrackWaveformCache();
  });

  it("stays idle without trackId", () => {
    const { result } = renderHook(() => useTrackWaveform(undefined));
    expect(result.current.status).toBe("idle");
    expect(result.current.waveform).toBeNull();
  });

  it("transitions loading → ready on success", async () => {
    const { result } = renderHook(() => useTrackWaveform("1"));
    expect(result.current.status).toBe("loading");
    expect(result.current.waveform).toBeNull();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.waveform).toEqual(sampleWaveform);
  });

  it("shows no waveform while loading (null data)", () => {
    const { result } = renderHook(() => useTrackWaveform("1"));
    expect(result.current.waveform).toBeNull();
  });

  it("becomes unavailable on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Waveform unavailable", code: "waveform_unavailable" }),
      }),
    );
    const { result } = renderHook(() => useTrackWaveform("404-track"));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.waveform).toBeNull();
  });

  it("serves cached waveform without refetch flicker", async () => {
    const { result, rerender } = renderHook(({ id }) => useTrackWaveform(id), {
      initialProps: { id: "1" as string | undefined },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();

    rerender({ id: "1" });
    expect(result.current.status).toBe("ready");
    expect(result.current.waveform).toEqual(sampleWaveform);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears waveform immediately when trackId changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo) => {
        const url = String(input);
        const match = /tracks\/([^/]+)\/waveform/.exec(url);
        const id = match?.[1] ?? "1";
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...sampleWaveform, trackId: id }),
        });
      }),
    );

    const { result, rerender } = renderHook(({ id }) => useTrackWaveform(id), {
      initialProps: { id: "1" as string | undefined },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ id: "2" });
    expect(result.current.waveform).toBeNull();
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.waveform?.trackId).toBe("2"));
  });
});
