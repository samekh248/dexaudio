import type { ReactNode } from "react";

interface AlbumGroupRowProps {
  title: string;
  entries: ReactNode[];
  /** When true, heading is rendered by parent LibraryGroupSection. */
  hideHeading?: boolean;
}

export function AlbumGroupRow({ title, entries, hideHeading = false }: AlbumGroupRowProps) {
  if (entries.length === 0) return null;

  const headingId = `group-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={hideHeading ? undefined : "mb-8"}>
      {!hideHeading ? (
        <h2 id={headingId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
      ) : null}
      <div
        role="region"
        aria-label={`${title} carousel`}
        tabIndex={0}
        className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {entries}
      </div>
    </div>
  );
}
