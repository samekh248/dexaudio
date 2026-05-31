import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getItem, StorageKeys } from "@/lib/local-storage.js";
import {
  bindRecentlyPlayedRefresh,
  resetRecentlyPlayedRefresh,
} from "@/lib/recently-played-refresh-coordinator.js";

export function useRecentlyPlayedRefresh() {
  const queryClient = useQueryClient();
  const libraryIdRef = useRef(getItem(StorageKeys.activeLibraryId, ""));

  useEffect(() => {
    bindRecentlyPlayedRefresh({
      queryClient,
      getLibraryId: () => libraryIdRef.current,
    });
    return () => {
      resetRecentlyPlayedRefresh();
    };
  }, [queryClient]);

  useEffect(() => {
    const syncLibraryId = () => {
      const next = getItem(StorageKeys.activeLibraryId, "");
      if (next !== libraryIdRef.current) {
        resetRecentlyPlayedRefresh();
        libraryIdRef.current = next;
      }
    };

    syncLibraryId();
    window.addEventListener("storage", syncLibraryId);
    const interval = setInterval(syncLibraryId, 2_000);

    return () => {
      window.removeEventListener("storage", syncLibraryId);
      clearInterval(interval);
    };
  }, []);
}
