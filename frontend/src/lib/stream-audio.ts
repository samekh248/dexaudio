import type { AudioQuality, Track, TrackFormat } from "@dexaudio/shared-types";
import { ApiError } from "@/services/api-client.js";
import { isLosslessCandidateFormat } from "@/lib/audio-capability.js";
import { isLosslessEnabled } from "@/lib/lossless-prefs-store.js";

const API_BASE = "/api/v1";
export const AUDIO_QUALITY_HEADER = "x-dexaudio-audio-quality";

export type StreamOptions = {
  lossless?: boolean;
};

export type FetchAudioOptions = StreamOptions & {
  signal?: AbortSignal;
};

export type FetchedAudio = {
  blob: Blob;
  quality: AudioQuality;
};

function parseQualityHeader(res: Response, requestedLossless: boolean): AudioQuality {
  const header = res.headers.get(AUDIO_QUALITY_HEADER);
  if (header === "lossless" || header === "transcoded") return header;
  return requestedLossless ? "lossless" : "transcoded";
}

/** Same-origin proxy URL for progressive HTML5 playback (Howler). */
export function streamUrlForTrack(trackId: string, options: StreamOptions = {}): string {
  const base = `${API_BASE}/stream/${trackId}`;
  if (options.lossless) return `${base}?quality=lossless`;
  return base;
}

export async function fetchTrackAudioBlob(
  trackId: string,
  options: FetchAudioOptions = {},
): Promise<FetchedAudio> {
  const url = streamUrlForTrack(trackId, { lossless: options.lossless });
  const res = await fetch(url, { signal: options.signal });
  const ct = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      action?: string;
    };
    throw new ApiError(body.message ?? res.statusText, res.status, body.code, body.action);
  }

  if (ct.includes("json") || ct.includes("text/html") || ct.includes("xml")) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new ApiError(body.message ?? "Server returned an error instead of audio", res.status, body.code);
  }

  const blob = await res.blob();
  if (blob.size < 256) {
    throw new ApiError("Audio stream was empty or invalid", 502, "BAD_GATEWAY");
  }

  return {
    blob,
    quality: parseQualityHeader(res, options.lossless === true),
  };
}

/** Whether this track load should request lossless delivery. */
export function shouldAttemptLossless(track: Track, forceTranscoded = false): boolean {
  if (forceTranscoded) return false;
  if (!isLosslessEnabled()) return false;
  // Never request lossless for known lossy browser-native formats.
  if (track.format === "mp3" || track.format === "aac" || track.format === "ogg") return false;
  // Attempt for flac/alac, unknown (parser miss), or other non-native formats;
  // server validates candidates and fallback handles decode/bandwidth failures.
  return true;
}

/** Howler format hints — stream URLs have no file extension. */
export function howlerFormatsForTrack(format: TrackFormat, options: StreamOptions = {}): string[] {
  if (options.lossless) {
    switch (format) {
      case "flac":
        return ["flac"];
      case "alac":
        return ["m4a", "mp4", "aac"];
      case "unsupported":
      case "wav":
        return ["flac", "m4a", "mp4"];
      default:
        break;
    }
  }

  switch (format) {
    case "mp3":
      return ["mp3", "mpeg"];
    case "aac":
      return ["aac", "m4a", "mp3"];
    case "ogg":
      return ["ogg", "opus"];
    case "flac":
    case "wav":
    case "alac":
    case "wma":
    case "unsupported":
      return ["mp3", "mpeg"];
  }
}

export function blobMimeForTrack(format: TrackFormat): string | undefined {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "aac":
      return "audio/aac";
    case "ogg":
      return "audio/ogg";
    case "flac":
      return "audio/flac";
    case "alac":
      return "audio/mp4";
    default:
      return "audio/mpeg";
  }
}

export function blobUrlForTrack(track: Track, blob: Blob): string {
  const mime = blobMimeForTrack(track.format);
  const typed = blob.type && blob.type !== "application/octet-stream" ? blob : new Blob([blob], { type: mime });
  return URL.createObjectURL(typed);
}

/** Infer playback quality from a cached blob when no response header is available. */
export function qualityFromCachedBlob(track: Track, blob: Blob): AudioQuality {
  if (!isLosslessCandidateFormat(track.format)) return "transcoded";
  const mime = blob.type || blobMimeForTrack(track.format) || "";
  if (mime.includes("flac") || mime.includes("mp4") || mime.includes("alac")) return "lossless";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "transcoded";
  return "lossless";
}
