import { isScrobbleEligible, scrobbleExpiresAt } from "./scrobble-threshold.js";
import { addPendingScrobble, getPendingScrobbles, removePendingScrobble } from "./indexed-db.js";
import { api } from "@/services/api-client.js";
import { scrobbleDedupKey, type Track } from "@dexaudio/shared-types";

interface ActiveListen {
  track: Track;
  startedAt: number;
  listenedMs: number;
}

let active: ActiveListen | null = null;

export function startListening(track: Track) {
  active = { track, startedAt: Date.now(), listenedMs: 0 };
}

export function updateListenPosition(ms: number) {
  if (active) active.listenedMs = ms;
}

export async function checkAndScrobble(): Promise<void> {
  if (!active) return;
  const { track, listenedMs, startedAt } = active;
  if (!isScrobbleEligible(listenedMs, track.durationMs)) return;

  const playedAt = new Date(startedAt).toISOString();
  try {
    await api.submitScrobble({
      track: track.title,
      artist: track.artist,
      album: track.album,
      playedAt,
      durationMs: track.durationMs,
    });
  } catch {
    await addPendingScrobble({
      id: scrobbleDedupKey({
        playedAt,
        track: track.title,
        artist: track.artist,
        album: track.album,
      }),
      scrobble: {
        track: track.title,
        artist: track.artist,
        album: track.album,
        played_at: playedAt,
      },
      expires_at: scrobbleExpiresAt(startedAt),
    });
  }
  active = null;
}

export async function flushPendingScrobbles(): Promise<number> {
  const pending = await getPendingScrobbles();
  let flushed = 0;
  for (const item of pending) {
    if (Date.now() > item.expires_at) {
      await removePendingScrobble(item.id);
      continue;
    }
    try {
      await api.submitScrobble({
        track: item.scrobble.track,
        artist: item.scrobble.artist,
        album: item.scrobble.album,
        playedAt: item.scrobble.played_at,
      });
      await removePendingScrobble(item.id);
      flushed += 1;
    } catch {
      // keep in queue
    }
  }
  return flushed;
}
