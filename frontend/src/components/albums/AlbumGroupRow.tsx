import type { ReactNode } from "react";

interface AlbumGroupRowProps {
  title: string;
  entries: ReactNode[];
}

export function AlbumGroupRow({ title, entries }: AlbumGroupRowProps) {
  const visible = entries.slice(0, 5);
  if (visible.length === 0) return null;

  const headingId = `group-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">{visible}</div>
    </section>
  );
}
