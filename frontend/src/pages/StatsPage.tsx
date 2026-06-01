import { useState } from "react";
import { Link } from "react-router-dom";
import type { StatsPeriod } from "@dexaudio/shared-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopTenList } from "@/components/stats/TopTenList";
import { OverviewCards } from "@/components/stats/OverviewCards";
import { SyncStatusBanner } from "@/components/stats/SyncStatusBanner";
import { PlaysOverTimeChart } from "@/components/stats/PlaysOverTimeChart";
import { ListeningClockChart } from "@/components/stats/ListeningClockChart";
import { WeekdayChart } from "@/components/stats/WeekdayChart";
import { CalendarHeatmap } from "@/components/stats/CalendarHeatmap";
import { EmptyState } from "@/components/ui/EmptyState";
import { useListeningOverview } from "@/hooks/use-listening-overview";
import { useListeningPatterns } from "@/hooks/use-listening-patterns";
import { useLastfmSync } from "@/hooks/use-lastfm-sync";

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "1m", label: "1mo" },
  { value: "3m", label: "3mo" },
  { value: "6m", label: "6mo" },
  { value: "12m", label: "12mo" },
  { value: "all", label: "All" },
];

function hasOverviewData(overview: ReturnType<typeof useListeningOverview>["data"]) {
  if (!overview) return false;
  return (
    overview.totalPlays > 0 ||
    overview.topArtists.length > 0 ||
    overview.topAlbums.length > 0 ||
    overview.topTracks.length > 0
  );
}

export function StatsPage() {
  const [period, setPeriod] = useState<StatsPeriod>("1m");
  const { data: overview, isLoading, refetch, isFetching } = useListeningOverview(period);
  const patternsEnabled = overview?.source === "lastfm";
  const { data: patterns } = useListeningPatterns(period, patternsEnabled);
  const { data: syncStatus } = useLastfmSync();

  const sourceLabel = overview?.source === "lastfm" ? "Last.fm" : "Plex";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Listening stats</h1>
        <div className="flex flex-wrap items-center gap-3">
          {overview && (
            <span
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium"
              aria-label={`Data source: ${sourceLabel}`}
            >
              Source: {sourceLabel}
            </span>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as StatsPeriod)}>
        <TabsList aria-label="Stats period">
          {PERIODS.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {syncStatus && <SyncStatusBanner status={syncStatus} />}

      {isLoading ? (
        <p>Loading stats…</p>
      ) : !hasOverviewData(overview) ? (
        <EmptyState
          title="No listening history yet"
          description="Connect Last.fm in settings to import your scrobble history, or play music through Plex."
          actionLabel="Last.fm settings"
          actionTo="/settings?tab=lastfm"
        />
      ) : overview ? (
        <>
          <OverviewCards overview={overview} />
          <div className="grid gap-6 md:grid-cols-3">
            <TopTenList title="Top artists" items={overview.topArtists} />
            <TopTenList title="Top albums" items={overview.topAlbums} />
            <TopTenList title="Top tracks" items={overview.topTracks} />
          </div>

          {overview.source === "plex" ? (
            <p className="text-sm text-muted-foreground">
              Pattern charts require Last.fm history.{" "}
              <Link to="/settings?tab=lastfm" className="underline">
                Connect Last.fm
              </Link>{" "}
              to see plays over time, listening clock, and calendar views.
            </p>
          ) : patterns ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <PlaysOverTimeChart data={patterns.playsOverTime} />
              <ListeningClockChart data={patterns.clock} />
              <WeekdayChart data={patterns.weekday} />
              <CalendarHeatmap data={patterns.calendar} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
