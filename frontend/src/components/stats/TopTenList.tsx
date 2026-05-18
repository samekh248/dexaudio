interface TopTenListProps {
  title: string;
  items: Array<{ label: string; sub?: string; count: number }>;
}

export function TopTenList({ title, items }: TopTenListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-2 font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">No play history yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex justify-between gap-2 text-sm">
            <span>
              <span className="text-muted-foreground mr-2">{i + 1}.</span>
              {item.label}
              {item.sub && <span className="block text-xs text-muted-foreground">{item.sub}</span>}
            </span>
            <span className="tabular-nums text-muted-foreground">{item.count}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
