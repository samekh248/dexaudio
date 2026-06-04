import { useEffect, useRef, useState } from "react";
import type { TrackWaveform } from "@dexaudio/shared-types";
import { ApiError } from "@/services/api-client";

export type WaveformStatus = "idle" | "loading" | "ready" | "unavailable" | "error";

const waveformCache = new Map<string, TrackWaveform>();

/** Clears session cache (tests). */
export function clearTrackWaveformCache(): void {
  waveformCache.clear();
}

async function fetchTrackWaveform(trackId: string, signal: AbortSignal): Promise<TrackWaveform> {
  const res = await fetch(`/api/v1/library/tracks/${encodeURIComponent(trackId)}/waveform`, {
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      action?: string;
    };
    throw new ApiError(body.message ?? res.statusText, res.status, body.code, body.action);
  }
  return res.json() as Promise<TrackWaveform>;
}

export function useTrackWaveform(trackId: string | undefined): {
  status: WaveformStatus;
  waveform: TrackWaveform | null;
} {
  const [status, setStatus] = useState<WaveformStatus>("idle");
  const [waveform, setWaveform] = useState<TrackWaveform | null>(null);
  const trackIdRef = useRef(trackId);

  useEffect(() => {
    trackIdRef.current = trackId;
    if (!trackId) {
      setStatus("idle");
      setWaveform(null);
      return;
    }

    const cached = waveformCache.get(trackId);
    setWaveform(cached ?? null);
    setStatus(cached ? "ready" : "loading");
    if (cached) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const data = await fetchTrackWaveform(trackId, controller.signal);
        if (trackIdRef.current !== trackId) return;
        waveformCache.set(trackId, data);
        setWaveform(data);
        setStatus("ready");
      } catch (err) {
        if (controller.signal.aborted || trackIdRef.current !== trackId) return;
        if (err instanceof ApiError && (err.status === 404 || err.code === "waveform_unavailable")) {
          setWaveform(null);
          setStatus("unavailable");
          return;
        }
        console.warn("[useTrackWaveform]", err);
        setWaveform(null);
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [trackId]);

  return { status, waveform };
}
