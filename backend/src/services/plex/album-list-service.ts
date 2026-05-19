import type { AlbumListItem, AllAlbumsResponse } from "@dexaudio/shared-types";
import type { PlexConfig } from "./plex-client.js";
import * as plexClient from "./plex-client.js";
import { proxyArtUrl } from "./plex-client.js";
import { compareAlbumTitles, sortKeyForTitle } from "./album-sort.js";
import * as libraryService from "./library-service.js";

export async function getAllAlbums(
  config: PlexConfig,
  libraryId: string,
): Promise<AllAlbumsResponse> {
  const albums = await libraryService.getAllAlbumsWithStats(config, libraryId);
  const items: AlbumListItem[] = albums
    .map((a) => ({
      id: a.id,
      title: a.title,
      artist: a.artist,
      artUrl: proxyArtUrl(a.artUrl),
      sortKey: sortKeyForTitle(a.title),
    }))
    .sort((a, b) => compareAlbumTitles(a.title, b.title));

  return { items, total: items.length };
}
