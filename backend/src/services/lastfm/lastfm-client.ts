import type { ScrobbleInput } from "@dexaudio/shared-types";
import { signParams } from "./lastfm-signature.js";

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

/**
 * Submits a scrobble to Last.fm. Write methods must be POSTed and signed:
 * every param is signed into `api_sig`, then sent as the form body.
 */
export async function submitScrobble(
  apiKey: string,
  apiSecret: string,
  sessionKey: string,
  scrobble: ScrobbleInput,
): Promise<boolean> {
  const params: Record<string, string> = {
    method: "track.scrobble",
    api_key: apiKey,
    sk: sessionKey,
    track: scrobble.track,
    artist: scrobble.artist,
    timestamp: String(Math.floor(new Date(scrobble.playedAt).getTime() / 1000)),
  };
  if (scrobble.album) params.album = scrobble.album;

  params.api_sig = signParams(params, apiSecret);

  const body = new URLSearchParams({ ...params, format: "json" });
  const res = await fetch(LASTFM_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const json = (await res.json().catch(() => ({}))) as { error?: number };
  return json.error == null;
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
