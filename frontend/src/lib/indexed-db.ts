const DB_NAME = "dexaudio-cache";
const DB_VERSION = 1;

export interface CacheEntry {
  track_rating_key: string;
  cache_kind: "pre-cache" | "permanent";
  version_signal: string;
  blob: Blob;
  byte_size: number;
  last_accessed_at: number;
  pinned: boolean;
}

export interface PendingScrobble {
  id: string;
  scrobble: {
    track: string;
    artist: string;
    album: string;
    played_at: string;
  };
  expires_at: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache_entries")) {
        db.createObjectStore("cache_entries", { keyPath: "track_rating_key" });
      }
      if (!db.objectStoreNames.contains("pending_scrobbles")) {
        db.createObjectStore("pending_scrobbles", { keyPath: "id" });
      }
    };
  });
}

export async function getCacheEntry(trackKey: string): Promise<CacheEntry | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache_entries", "readonly");
    const req = tx.objectStore("cache_entries").get(trackKey);
    req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function putCacheEntry(entry: CacheEntry): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache_entries", "readwrite");
    tx.objectStore("cache_entries").put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCacheEntry(trackKey: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache_entries", "readwrite");
    tx.objectStore("cache_entries").delete(trackKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllCacheEntries(): Promise<CacheEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache_entries", "readonly");
    const req = tx.objectStore("cache_entries").getAll();
    req.onsuccess = () => resolve(req.result as CacheEntry[]);
    req.onerror = () => reject(req.error);
  });
}

export async function addPendingScrobble(item: PendingScrobble): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_scrobbles", "readwrite");
    tx.objectStore("pending_scrobbles").put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingScrobbles(): Promise<PendingScrobble[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_scrobbles", "readonly");
    const req = tx.objectStore("pending_scrobbles").getAll();
    req.onsuccess = () => resolve(req.result as PendingScrobble[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingScrobble(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_scrobbles", "readwrite");
    tx.objectStore("pending_scrobbles").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
