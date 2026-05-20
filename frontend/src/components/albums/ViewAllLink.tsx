import { Link } from "react-router-dom";
import type { LibraryGroupKey } from "@dexaudio/shared-types";

const ROUTES: Partial<Record<LibraryGroupKey, string>> = {
  "recently-played": "/library/recently-played",
  "recently-added": "/library/recently-added",
  "hidden-gems": "/library/hidden-gems",
  "artist-spotlights": "/library/artist-spotlights",
};

interface ViewAllLinkProps {
  groupKey: LibraryGroupKey;
  groupTitle: string;
}

export function ViewAllLink({ groupKey, groupTitle }: ViewAllLinkProps) {
  const to = ROUTES[groupKey];
  if (!to) return null;

  return (
    <Link
      to={to}
      className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      View all {groupTitle.toLowerCase()}
    </Link>
  );
}
