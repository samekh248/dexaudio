import type { TopStats } from "@dexaudio/shared-types";
import type { PlexConfig } from "./plex-client.js";

export async function aggregateTopStats(config: PlexConfig): Promise<TopStats> {
  const base = config.serverUrl.replace(/\/$/, "");
  const url = `${base}/library/all?type=10&sort=viewCount:desc&X-Plex-Container-Size=10&X-Plex-Token=${encodeURIComponent(config.token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { songs: [], albums: [], artists: [] };
  }
  const xml = await res.text();
  return parseTopStatsXml(xml);
}

export function parseTopStatsXml(xml: string): TopStats {
  const songs: TopStats["songs"] = [];
  const trackRegex = /<Track([^>]*)\/>/g;
  let match: RegExpExecArray | null;
  while ((match = trackRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1]);
    const playCount = Number(attrs.viewCount ?? 0);
    if (playCount <= 0) continue;
    songs.push({
      track: {
        id: attrs.ratingKey ?? "",
        title: attrs.title ?? "Unknown",
        artist: attrs.grandparentTitle ?? "Unknown",
        album: attrs.parentTitle ?? "Unknown",
        durationMs: Number(attrs.duration ?? 0),
        format: "mp3",
        playCount,
      },
      playCount,
    });
  }

  const albums: TopStats["albums"] = [];
  const artists: TopStats["artists"] = [];
  const artistCounts = new Map<string, number>();

  for (const song of songs) {
    const artistName = song.track.artist;
    artistCounts.set(artistName, (artistCounts.get(artistName) ?? 0) + song.playCount);
  }

  const sortedArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, playCount]) => ({ name, playCount }));

  return {
    songs: songs.slice(0, 10),
    albums: albums.slice(0, 10),
    artists: sortedArtists,
  };
}

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) attrs[m[1]] = m[2];
  return attrs;
}
