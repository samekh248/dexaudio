import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  Album,
  AlbumGroupResponse,
  ArtistSpotlight,
  ArtistSpotlightGroupResponse,
  LibraryGroupKey,
} from "@dexaudio/shared-types";
import { Button } from "@/components/ui/button";
import { ViewAllLink } from "./ViewAllLink";

type GroupItems = Album[] | ArtistSpotlight[];
type GroupQueryResult = UseQueryResult<AlbumGroupResponse | ArtistSpotlightGroupResponse>;

interface LibraryGroupSectionProps {
  title: string;
  groupKey: LibraryGroupKey;
  query: GroupQueryResult;
  showViewAll?: boolean;
  children: (items: GroupItems) => ReactNode;
}

export function LibraryGroupSection({
  title,
  groupKey,
  query,
  showViewAll = true,
  children,
}: LibraryGroupSectionProps) {
  const { data, isPending, isError, refetch } = query;

  const headingId = `group-${title.replace(/\s+/g, "-").toLowerCase()}`;

  if (isPending) {
    return (
      <section className="mb-8 min-h-[220px]" aria-labelledby={headingId} aria-busy="true">
        <h2 id={headingId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mb-8" aria-labelledby={headingId}>
        <h2 id={headingId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">Couldn&apos;t load {title.toLowerCase()}.</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      {children(items)}
      {showViewAll ? <ViewAllLink groupKey={groupKey} groupTitle={title} /> : null}
    </section>
  );
}
