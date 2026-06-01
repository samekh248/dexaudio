import type { ListeningOverview } from "@dexaudio/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface OverviewCardsProps {
  overview: ListeningOverview;
}

export function OverviewCards({ overview }: OverviewCardsProps) {
  const busiestDay =
    overview.busiestDate != null
      ? `${overview.busiestDate.date} (${overview.busiestDate.count} plays)`
      : "—";
  const busiestWeekday =
    overview.busiestWeekday != null
      ? `${WEEKDAYS[overview.busiestWeekday.weekday]} (${overview.busiestWeekday.count} plays)`
      : "—";

  const cards = [
    { title: "Plays in period", value: overview.totalPlays },
    { title: "All-time plays", value: overview.totalPlaysAllTime },
    { title: "Unique artists", value: overview.uniqueArtists },
    { title: "Unique albums", value: overview.uniqueAlbums },
    { title: "Unique tracks", value: overview.uniqueTracks },
    { title: "Avg plays / day", value: overview.avgPlaysPerDay.toFixed(1) },
    { title: "Busiest date", value: busiestDay },
    { title: "Busiest weekday", value: busiestWeekday },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
