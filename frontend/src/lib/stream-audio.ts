import type { Track, TrackFormat } from "@dexaudio/shared-types";
import { ApiError } from "@/services/api-client.js";

const API_BASE = "/api/v1";

export async function fetchTrackAudioBlob(trackId: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${API_BASE}/stream/${trackId}`, { signal });
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
  return blob;
}

/** Howler format hints — stream URLs have no file extension. */
export function howlerFormatsForTrack(format: TrackFormat): string[] {
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
    default:
      return "audio/mpeg";
  }
}

export function blobUrlForTrack(track: Track, blob: Blob): string {
  const mime = blobMimeForTrack(track.format);
  const typed = blob.type && blob.type !== "application/octet-stream" ? blob : new Blob([blob], { type: mime });
  return URL.createObjectURL(typed);
}
