import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/services/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { getItem, StorageKeys } from "@/lib/local-storage";

export function AlbumGridPage() {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");

  const { data, isLoading, error } = useQuery({
    queryKey: ["albums", libraryId],
    queryFn: () => api.getAlbums(libraryId),
    enabled: !!libraryId,
  });

  if (!libraryId) {
    return (
      <p className="text-muted-foreground">
        Connect Plex and select a library in <Link to="/settings" className="underline">Settings</Link>.
      </p>
    );
  }

  if (isLoading) return <p>Loading albums…</p>;
  if (error) return <p className="text-red-500">Failed to load albums</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Albums</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {data?.items.map((album) => (
          <Link key={album.id} to={`/albums/${album.id}`}>
            <Card className="overflow-hidden transition hover:shadow-md">
              <AspectRatio ratio={1}>
                {album.artUrl ? (
                  <img src={album.artUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xs">
                    No art
                  </div>
                )}
              </AspectRatio>
              <CardContent className="p-2">
                <p className="truncate text-sm font-medium">{album.title}</p>
                <p className="truncate text-xs text-muted-foreground">{album.artist}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
