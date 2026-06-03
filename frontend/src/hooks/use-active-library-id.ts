import { useEffect, useState } from "react";
import { getItem, LIBRARY_CHANGED_EVENT, StorageKeys } from "@/lib/local-storage";

/** Reactive Plex library id (updates after auth/settings without full reload). */
export function useActiveLibraryId(): string {
  const [libraryId, setLibraryId] = useState(() => getItem(StorageKeys.activeLibraryId, ""));

  useEffect(() => {
    const sync = () => setLibraryId(getItem(StorageKeys.activeLibraryId, ""));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(LIBRARY_CHANGED_EVENT, sync);
    const interval = window.setInterval(sync, 2_000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(LIBRARY_CHANGED_EVENT, sync);
      window.clearInterval(interval);
    };
  }, []);

  return libraryId;
}
