import type { TrackFormat } from "@dexaudio/shared-types";

const losslessSupport = new Map<TrackFormat, boolean>();

function canPlayType(mime: string): boolean {
  if (typeof document === "undefined") return false;
  const audio = document.createElement("audio");
  const result = audio.canPlayType(mime);
  return result === "probably" || result === "maybe";
}

function probeLossless(format: TrackFormat): boolean {
  const cached = losslessSupport.get(format);
  if (cached !== undefined) return cached;

  let supported = false;
  switch (format) {
    case "flac":
      supported =
        canPlayType("audio/flac") ||
        canPlayType("audio/x-flac") ||
        canPlayType('audio/mp4; codecs="flac"') ||
        canPlayType("audio/ogg; codecs=flac");
      break;
    case "alac":
      supported = canPlayType('audio/mp4; codecs="alac"');
      break;
    default:
      supported = false;
  }

  losslessSupport.set(format, supported);
  return supported;
}

/** Whether the current browser can decode the given lossless format in HTML5 audio. */
export function canPlayLossless(format: TrackFormat): boolean {
  return probeLossless(format);
}

export function isLosslessCandidateFormat(format: TrackFormat): boolean {
  return format === "flac" || format === "alac";
}

/** Reset memoized probes (for tests). */
export function resetLosslessCapabilityCache(): void {
  losslessSupport.clear();
}
