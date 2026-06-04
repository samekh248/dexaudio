import type { TrackWaveform } from "@dexaudio/shared-types";
import { AppError, BadGatewayError } from "../../lib/errors.js";
import type { PlexConfig } from "./plex-client.js";
import {
  fetchStreamLevels,
  fetchTrackStreamContext,
  normalizeLevelSamples,
} from "./plex-client.js";

function waveformUnavailable(): AppError {
  return new AppError("Waveform unavailable", 404, "waveform_unavailable");
}

export async function getTrackWaveform(
  config: PlexConfig,
  trackId: string,
  subsample: number,
): Promise<TrackWaveform> {
  const ctx = await fetchTrackStreamContext(config, trackId);
  if (!ctx.track) throw waveformUnavailable();
  if (!ctx.audioStreamId) throw waveformUnavailable();

  const levels = await fetchStreamLevels(config, ctx.audioStreamId, subsample);
  if (!levels.ok) {
    if (levels.status === 401) {
      throw new AppError(
        "Plex authentication expired",
        401,
        "AUTH_EXPIRED",
        "Re-authenticate with your Plex account",
      );
    }
    if (levels.status === 404) throw waveformUnavailable();
    throw new BadGatewayError(
      "Could not fetch waveform from Plex",
      "Check that your Plex server is running and reachable",
    );
  }

  const samples = normalizeLevelSamples(levels.values);
  if (samples.length === 0) throw waveformUnavailable();

  const durationMs = ctx.track.durationMs;
  const sampleIntervalMs =
    levels.totalSamples && levels.totalSamples > 0 && durationMs > 0
      ? Math.max(1, Math.round(durationMs / levels.totalSamples))
      : 100;

  return {
    trackId,
    samples,
    sampleIntervalMs,
    durationMs,
  };
}
