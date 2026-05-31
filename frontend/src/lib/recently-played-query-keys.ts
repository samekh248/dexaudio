/** TanStack Query key prefix for Recently Played group (home limit 10 and View all limit 20). */
export function recentlyPlayedGroupQueryKey(libraryId: string) {
  return ["album-group", "recently-played", libraryId] as const;
}
