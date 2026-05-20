import type {
  PlaybackAffordance,
  PlaybackErrorCategory,
  PlaybackFailure,
  Track,
} from "@dexaudio/shared-types";
import { ApiError } from "@/services/api-client.js";

export function isSessionLevelError(category: PlaybackErrorCategory): boolean {
  return (
    category === "server_unreachable" ||
    category === "auth_expired" ||
    category === "network_interrupted" ||
    category === "autoplay_blocked"
  );
}

function failure(
  category: PlaybackErrorCategory,
  message: string,
  affordances: PlaybackAffordance[],
  track?: Track,
  technicalDetail?: string,
): PlaybackFailure {
  const failureEvent: PlaybackFailure = {
    category,
    message,
    affordances,
    timestamp: new Date().toISOString(),
    trackTitle: track?.title,
    trackArtist: track?.artist,
    trackId: track?.id,
    technicalDetail,
  };
  console.error("[playback]", {
    category: failureEvent.category,
    trackId: failureEvent.trackId,
    technicalDetail: failureEvent.technicalDetail,
    timestamp: failureEvent.timestamp,
  });
  return failureEvent;
}

function fromApiError(error: ApiError, track?: Track): PlaybackFailure {
  const detail = [error.code, error.action].filter(Boolean).join(" — ");
  switch (error.status) {
    case 401:
      return failure(
        "auth_expired",
        error.message || "Plex authentication expired",
        ["sign_in", "retry"],
        track,
        detail,
      );
    case 404:
      return failure(
        "track_not_found",
        error.message || "Track not found",
        ["skip"],
        track,
        detail,
      );
    case 415:
      return failure(
        "unsupported_format",
        error.message || "Unsupported audio format",
        ["skip"],
        track,
        detail,
      );
    case 502:
      return failure(
        "server_unreachable",
        error.message || "Could not reach Plex server",
        ["retry", "back_to_library"],
        track,
        detail,
      );
    default:
      if (error.status >= 500) {
        return failure(
          "server_unreachable",
          error.message || "Server error",
          ["retry", "back_to_library"],
          track,
          detail,
        );
      }
      return failure("unknown", error.message || "Playback failed", ["skip"], track, detail);
  }
}

/** Howler/HTML5 abort when a load is cancelled — not a user-facing failure. */
export function isIgnorableHowlerError(error: unknown): boolean {
  if (error === 1 || error === "1") return true;
  if (typeof error === "string") {
    const lower = error.toLowerCase();
    if (lower.includes("abort") || lower.includes("interrupted")) return true;
  }
  return false;
}

function fromHowlerError(error: number | string, track?: Track): PlaybackFailure {
  const msg = typeof error === "string" ? error : "";
  const code = typeof error === "number" ? error : 0;

  if (msg) {
    const lower = msg.toLowerCase();
    if (lower.includes("decode") || lower.includes("format")) {
      return failure(
        "unsupported_format",
        "This track could not be decoded",
        ["skip"],
        track,
        `howler:${msg}`,
      );
    }
    if (lower.includes("network") || lower.includes("fetch")) {
      return failure(
        "network_interrupted",
        "Network connection interrupted",
        ["retry", "back_to_library"],
        track,
        `howler:${msg}`,
      );
    }
    if (lower.includes("not supported") || lower.includes("no codec")) {
      return failure(
        "unsupported_format",
        "This audio format is not supported in your browser",
        ["skip"],
        track,
        `howler:${msg}`,
      );
    }
  }

  if (code === 2) {
    return failure(
      "network_interrupted",
      "Network connection interrupted",
      ["retry", "back_to_library"],
      track,
      `howler:${code} ${msg}`,
    );
  }
  if (code === 3) {
    return failure(
      "unsupported_format",
      "This track could not be decoded",
      ["skip"],
      track,
      `howler:${code} ${msg}`,
    );
  }
  if (code === 4) {
    return failure("unknown", "Media source could not be played", ["skip"], track, `howler:${code} ${msg}`);
  }
  return failure("unknown", "Playback failed", ["skip"], track, `howler:${code} ${msg}`);
}

export function classifyPlaybackError(
  source: "api" | "howler",
  error: ApiError | number | string,
  track?: Track,
): PlaybackFailure {
  if (source === "api" && error instanceof ApiError) {
    return fromApiError(error, track);
  }
  return fromHowlerError(error as number | string, track);
}

export function isAutoplayBlockedError(error: number | string): boolean {
  const msg = typeof error === "string" ? error.toLowerCase() : "";
  return (
    msg.includes("play()") ||
    msg.includes("user didn't interact") ||
    msg.includes("autoplay") ||
    msg.includes("gesture")
  );
}
