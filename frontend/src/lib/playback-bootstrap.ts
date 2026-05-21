import {
  loadSnapshot,
  notifyRestoreFailure,
  RESTORE_FAILURE_MESSAGE,
  type RestoreOutcome,
} from "@/lib/playback-session";
import { getItem, StorageKeys } from "@/lib/local-storage";
import { usePlaybackQueue } from "@/stores/playback-queue-store";
import { toast } from "@/components/ui/sonner";

export function bootstrapPlaybackSession(): RestoreOutcome {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  const { snapshot, outcome } = loadSnapshot(libraryId);
  usePlaybackQueue.getState().hydrateFromSnapshot(snapshot);

  if (notifyRestoreFailure(outcome)) {
    toast(RESTORE_FAILURE_MESSAGE);
  }

  return outcome;
}
