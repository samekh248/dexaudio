import { useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  Album,
  AlbumGroupResponse,
  ArtistSpotlight,
  ArtistSpotlightGroupResponse,
  LibraryGroupKey,
} from "@dexaudio/shared-types";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/services/api-client";
import { ViewAllLink } from "./ViewAllLink";
import { LibraryGroupReveal } from "./LibraryGroupReveal";
import type { GroupRevealPhase } from "@/hooks/use-library-group-reveal";

type GroupItems = Album[] | ArtistSpotlight[];
type GroupQueryResult = UseQueryResult<AlbumGroupResponse | ArtistSpotlightGroupResponse>;

interface LibraryGroupSectionProps {
  title: string;
  groupKey: LibraryGroupKey;
  libraryId: string;
  query: GroupQueryResult;
  showViewAll?: boolean;
  children: (items: GroupItems) => ReactNode;
}

export function LibraryGroupSection({
  title,
  groupKey,
  libraryId,
  query,
  showViewAll = true,
  children,
}: LibraryGroupSectionProps) {
  const { data, isPending, isError, refetch, failureCount } = query;
  const [revealPhase, setRevealPhase] = useState<GroupRevealPhase>("revealed");

  const headingId = `group-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const revealBusy = revealPhase !== "revealed";

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
    const err = query.error;
    const needsPlex =
      err instanceof ApiError &&
      (err.code === "plex_not_connected" || err.status === 401);
    return (
      <section className="mb-8" aria-labelledby={headingId}>
        <h2 id={headingId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {needsPlex
            ? "Plex is not connected to DexAudio. Sign in again in Settings."
            : `Couldn't load ${title.toLowerCase()}.`}
        </p>
        {needsPlex ? (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/settings">Open Settings</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
            Retry
          </Button>
        )}
      </section>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const revealInstanceKey = `${groupKey}-${failureCount ?? 0}`;
  const entryCount = groupKey === "random-picks" ? items.length + 1 : items.length;

  return (
    <section className="mb-8" aria-labelledby={headingId} aria-busy={revealBusy || undefined}>
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {showViewAll ? <ViewAllLink groupKey={groupKey} groupTitle={title} /> : null}
      </div>
      <LibraryGroupReveal
        key={revealInstanceKey}
        libraryId={libraryId}
        groupKey={groupKey}
        entryCount={entryCount}
        onPhaseChange={setRevealPhase}
      >
        {children(items)}
      </LibraryGroupReveal>
    </section>
  );
}
