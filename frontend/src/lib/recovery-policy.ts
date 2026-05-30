/** Centralized recovery constants and helpers (specs/014-robust-playback). */

export const RECOVERY_POLICY = {
  maxRetries: 3,
  backoffMs: [500, 1000, 2000] as const,
  stallWindowMs: 10_000,
  stallDetectMs: 1_500,
} as const;

export function backoffForAttempt(attempt: number): number {
  const idx = Math.min(Math.max(attempt - 1, 0), RECOVERY_POLICY.backoffMs.length - 1);
  return RECOVERY_POLICY.backoffMs[idx];
}

export function retriesRemaining(attempt: number): boolean {
  return attempt < RECOVERY_POLICY.maxRetries;
}

export function stallWindowExceeded(stallStartedAt: number | null, nowMs: number): boolean {
  if (stallStartedAt === null) return false;
  return nowMs - stallStartedAt >= RECOVERY_POLICY.stallWindowMs;
}

export function shouldEnterBuffering(
  lastProgressMs: number,
  lastProgressAt: number | null,
  nowMs: number,
): boolean {
  if (lastProgressAt === null) return false;
  return nowMs - lastProgressAt >= RECOVERY_POLICY.stallDetectMs;
}
