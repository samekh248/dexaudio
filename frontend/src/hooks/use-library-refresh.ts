import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { getItem, StorageKeys } from "@/lib/local-storage";

/** FR-061: refresh Plex library metadata on launch when policy is on_launch. */
export function useLibraryRefreshOnLaunch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void (async () => {
      try {
        const settings = await api.getSettings();
        if (settings.libraryRefreshPolicy !== "on_launch") return;
        const libraryId = getItem(StorageKeys.activeLibraryId, "");
        if (!libraryId) return;
        await queryClient.invalidateQueries({ queryKey: ["albums", libraryId] });
        await queryClient.invalidateQueries({ queryKey: ["library-home-groups", libraryId] });
        await queryClient.invalidateQueries({ queryKey: ["album-group"] });
        await queryClient.invalidateQueries({ queryKey: ["top-stats"] });
      } catch {
        // settings unavailable until backend is up
      }
    })();
  }, [queryClient]);
}
