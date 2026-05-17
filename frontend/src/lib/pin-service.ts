import { getAllCacheEntries, putCacheEntry } from "./indexed-db.js";
import { getItem, StorageKeys } from "./local-storage.js";

export type PinTarget = { type: "track" | "album" | "artist"; id: string };

const pins = new Set<string>();

export function pinTarget(target: PinTarget) {
  pins.add(`${target.type}:${target.id}`);
}

export function unpinTarget(target: PinTarget) {
  pins.delete(`${target.type}:${target.id}`);
}

export function isPinned(target: PinTarget): boolean {
  return pins.has(`${target.type}:${target.id}`);
}

export async function promoteToPermanent(trackKey: string): Promise<boolean> {
  const entries = await getAllCacheEntries();
  const permanent = entries.filter((e) => e.cache_kind === "permanent");
  const capGb = getItem(StorageKeys.permanentCapGb, 10);
  const capBytes = capGb * 1024 * 1024 * 1024;
  const used = permanent.reduce((s, e) => s + e.byte_size, 0);
  const entry = entries.find((e) => e.track_rating_key === trackKey);
  if (!entry) return false;
  if (used + entry.byte_size > capBytes) return false;

  await putCacheEntry({ ...entry, cache_kind: "permanent", pinned: true });
  return true;
}

export function getPinnedKeys(): string[] {
  return [...pins];
}
