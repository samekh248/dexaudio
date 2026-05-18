import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { TopTenList } from "@/components/stats/TopTenList";
import { EmptyState } from "@/components/ui/EmptyState";

export function StatsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["top-stats"],
    queryFn: () => api.getTopStats(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Listening stats</h1>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          Refresh
        </Button>
      </div>
      {isLoading ? (
        <p>Loading stats…</p>
      ) : !data?.songs.length && !data?.albums.length && !data?.artists.length ? (
        <EmptyState
          title="No listening history yet"
          description="Play some music on Plex through this app and your Top 10 lists will appear here."
          actionLabel="Browse library"
          actionTo="/"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <TopTenList title="Top songs" items={data?.songs.map((s) => ({ label: s.track.title, sub: s.track.artist, count: s.playCount })) ?? []} />
          <TopTenList title="Top albums" items={data?.albums.map((a) => ({ label: a.album.title, sub: a.album.artist, count: a.playCount })) ?? []} />
          <TopTenList title="Top artists" items={data?.artists.map((a) => ({ label: a.name, count: a.playCount })) ?? []} />
        </div>
      )}
    </div>
  );
}
