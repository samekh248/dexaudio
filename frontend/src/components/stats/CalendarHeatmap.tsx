import type { TimeSeriesPoint } from "@dexaudio/shared-types";

interface CalendarHeatmapProps {
  data: TimeSeriesPoint[];
}

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const summary = `Calendar heatmap: ${total} plays across ${data.length} days.`;

  return (
    <section className="rounded-lg border border-border p-4" aria-label={summary}>
      <h2 className="mb-2 font-semibold">Calendar</h2>
      <p className="sr-only">{summary}</p>
      <div className="flex flex-wrap gap-1" role="img" aria-label={summary}>
        {data.map((d) => {
          const intensity = d.count / max;
          return (
            <div
              key={d.bucket}
              title={`${d.bucket}: ${d.count} plays`}
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
              }}
            />
          );
        })}
      </div>
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground">No daily plays in this period.</p>
      )}
    </section>
  );
}
