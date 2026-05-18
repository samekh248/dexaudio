import type { ScrobbleInput } from "@dexaudio/shared-types";

export async function submitScrobble(
  apiKey: string,
  sessionKey: string,
  scrobble: ScrobbleInput,
): Promise<boolean> {
  const params = new URLSearchParams({
    method: "track.scrobble",
    api_key: apiKey,
    sk: sessionKey,
    track: scrobble.track,
    artist: scrobble.artist,
    album: scrobble.album,
    timestamp: String(Math.floor(new Date(scrobble.playedAt).getTime() / 1000)),
  });

  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, { method: "POST" });
  return res.ok;
}

export function isScrobbleEligible(
  listenedMs: number,
  trackDurationMs: number,
  thresholdPercent = 0.5,
  minSeconds = 240,
): boolean {
  const halfDuration = trackDurationMs * thresholdPercent;
  const threshold = Math.min(minSeconds * 1000, halfDuration);
  return listenedMs >= threshold;
}
