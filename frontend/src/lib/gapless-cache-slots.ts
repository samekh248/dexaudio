export type GaplessCacheSlot = {
  priority: 1 | 2 | 3 | 4;
  queueIndex: number;
  trackId: string;
};

/** Priority: next, previous, second-ahead, two-behind. */
export function buildGaplessSlots(
  queueLength: number,
  currentIndex: number,
  trackIds: string[],
): GaplessCacheSlot[] {
  const offsets: Array<{ priority: 1 | 2 | 3 | 4; delta: number }> = [
    { priority: 1, delta: 1 },
    { priority: 2, delta: -1 },
    { priority: 3, delta: 2 },
    { priority: 4, delta: -2 },
  ];

  const slots: GaplessCacheSlot[] = [];
  for (const { priority, delta } of offsets) {
    const queueIndex = currentIndex + delta;
    if (queueIndex < 0 || queueIndex >= queueLength) continue;
    const trackId = trackIds[queueIndex];
    if (!trackId) continue;
    slots.push({ priority, queueIndex, trackId });
  }
  return slots;
}
