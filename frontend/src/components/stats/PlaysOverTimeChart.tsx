import type { TimeSeriesPoint } from "@dexaudio/shared-types";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface PlaysOverTimeChartProps {
  data: TimeSeriesPoint[];
}

export function PlaysOverTimeChart({ data }: PlaysOverTimeChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const summary = `Plays over time: ${total} total plays across ${data.length} buckets.`;

  return (
    <section className="rounded-lg border border-border p-4" aria-label={summary}>
      <h2 className="mb-2 font-semibold">Plays over time</h2>
      <p className="sr-only">{summary}</p>
      <ChartContainer config={{ plays: { label: "Plays", color: "hsl(var(--primary))" } }} className="h-48">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} width={32} />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
