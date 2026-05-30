import { describe, expect, it } from "vitest";
import {
  RECOVERY_POLICY,
  backoffForAttempt,
  retriesRemaining,
  shouldEnterBuffering,
  stallWindowExceeded,
} from "@/lib/recovery-policy";

describe("recovery-policy", () => {
  it("uses configured backoff sequence", () => {
    expect(backoffForAttempt(1)).toBe(500);
    expect(backoffForAttempt(2)).toBe(1000);
    expect(backoffForAttempt(3)).toBe(2000);
    expect(backoffForAttempt(99)).toBe(2000);
  });

  it("allows up to maxRetries attempts", () => {
    expect(retriesRemaining(0)).toBe(true);
    expect(retriesRemaining(RECOVERY_POLICY.maxRetries - 1)).toBe(true);
    expect(retriesRemaining(RECOVERY_POLICY.maxRetries)).toBe(false);
  });

  it("detects stall window exhaustion", () => {
    const start = 1000;
    expect(stallWindowExceeded(null, start + 5000)).toBe(false);
    expect(stallWindowExceeded(start, start + RECOVERY_POLICY.stallWindowMs - 1)).toBe(false);
    expect(stallWindowExceeded(start, start + RECOVERY_POLICY.stallWindowMs)).toBe(true);
  });

  it("detects progress stall threshold", () => {
    const now = 5000;
    expect(shouldEnterBuffering(1000, now - 500, now)).toBe(false);
    expect(shouldEnterBuffering(1000, now - RECOVERY_POLICY.stallDetectMs, now)).toBe(true);
  });
});
