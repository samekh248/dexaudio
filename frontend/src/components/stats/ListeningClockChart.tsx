import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface ListeningClockChartProps {
  data: Array<{ hour: number; count: number }>;
}

export function ListeningClockChart({ data }: ListeningClockChartProps) {
  const peak = data.reduce((best, d) => (d.count > best.count ? d : best), data[0] ?? { hour: 0, count: 0 });
  const summary = `Listening clock by hour; peak at ${peak.hour}:00 with ${peak.count} plays.`;

  return (
    <section className="rounded-lg border border-border p-4" aria-label={summary}>
      <h2 className="mb-2 font-semibold">Listening clock</h2>
      <p className="sr-only">{summary}</p>
      <ChartContainer config={{ plays: { label: "Plays" } }} className="h-48">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}`} />
          <YAxis allowDecimals={false} width={32} />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
