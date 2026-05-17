import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/services/api-client";
import { Card, CardContent } from "@/components/ui/card";

export function ArtistAlbumsPage() {
  const { artistId } = useParams<{ artistId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["artist-albums", artistId],
    queryFn: () => api.getArtistAlbums(artistId!),
    enabled: !!artistId,
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Artist albums</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {data?.map((album) => (
          <Link key={album.id} to={`/albums/${album.id}`}>
            <Card>
              <CardContent className="p-3">
                <p className="font-medium">{album.title}</p>
                {album.year && <p className="text-xs text-muted-foreground">{album.year}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
