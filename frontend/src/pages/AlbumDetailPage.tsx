import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "@/services/api-client";
import { TrackRow } from "@/components/library/TrackRow";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

export function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const playNow = usePlaybackQueue((s) => s.playNow);
  const addToQueue = usePlaybackQueue((s) => s.addToQueue);

  const { data: tracks, isLoading } = useQuery({
    queryKey: ["album-tracks", albumId],
    queryFn: () => api.getAlbumTracks(albumId!),
    enabled: !!albumId,
  });

  if (isLoading) return <p>Loading tracks…</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Album</h1>
      <div className="space-y-1">
        {tracks?.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            onPlayNow={() => playNow([track])}
            onAddToQueue={() => addToQueue([track])}
          />
        ))}
      </div>
    </div>
  );
}
