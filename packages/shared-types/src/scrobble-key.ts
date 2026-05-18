/** Stable id for scrobble dedup (FR-088): play time + track identity. */
export function scrobbleDedupKey(input: {
  playedAt: string;
  track: string;
  artist: string;
  album: string;
}): string {
  return `${input.playedAt}|${input.artist}|${input.track}|${input.album}`;
}
