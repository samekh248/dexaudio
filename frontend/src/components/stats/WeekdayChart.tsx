import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeekdayChartProps {
  data: Array<{ weekday: number; count: number }>;
}

export function WeekdayChart({ data }: WeekdayChartProps) {
  const chartData = data.map((d) => ({ ...d, label: LABELS[d.weekday] ?? String(d.weekday) }));
  const total = data.reduce((s, d) => s + d.count, 0);
  const summary = `Weekday distribution: ${total} plays in period.`;

  return (
    <section className="rounded-lg border border-border p-4" aria-label={summary}>
      <h2 className="mb-2 font-semibold">By weekday</h2>
      <p className="sr-only">{summary}</p>
      <ChartContainer config={{ plays: { label: "Plays" } }} className="h-48">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} width={32} />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
