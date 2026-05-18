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

export function scrobbleExpiresAt(playedAtMs: number): number {
  return playedAtMs + 24 * 60 * 60 * 1000;
}
