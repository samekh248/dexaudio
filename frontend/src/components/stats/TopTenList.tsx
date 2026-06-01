interface TopTenListProps {
  title: string;
  items: Array<{ label: string; sub?: string; count: number; imageUrl?: string }>;
}

const PLACEHOLDER_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23374151' width='40' height='40'/%3E%3C/svg%3E";

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
          <li key={`${item.label}-${i}`} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <img
                src={item.imageUrl ?? PLACEHOLDER_ART}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded object-cover"
              />
              <span className="min-w-0">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {item.label}
                {item.sub && <span className="block text-xs text-muted-foreground">{item.sub}</span>}
              </span>
            </span>
            <span className="tabular-nums text-muted-foreground">{item.count}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
