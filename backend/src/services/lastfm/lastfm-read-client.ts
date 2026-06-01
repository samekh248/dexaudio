const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";
export const PAGE_DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RATE_LIMIT_RETRIES = 8;

export interface LastfmRecentTrack {
  track: string;
  artist: string;
  album: string | null;
  playedAt: Date;
  artistMbid: string | null;
  albumMbid: string | null;
  imageUrl: string | null;
}

export interface LastfmRecentPage {
  tracks: LastfmRecentTrack[];
  page: number;
  totalPages: number;
}

function pickImage(images: Array<{ "#text": string; size: string }> | undefined): string | null {
  if (!images?.length) return null;
  const order = ["extralarge", "large", "medium", "small"];
  for (const size of order) {
    const img = images.find((i) => i.size === size && i["#text"]);
    if (img?.["#text"]) return img["#text"];
  }
  return images.find((i) => i["#text"])?.["#text"] ?? null;
}

function parseTrack(entry: Record<string, unknown>): LastfmRecentTrack | null {
  if ((entry["@attr"] as { nowplaying?: string } | undefined)?.nowplaying === "true") {
    return null;
  }
  const artist =
    typeof entry.artist === "object" && entry.artist != null
      ? String((entry.artist as { "#text"?: string; name?: string })["#text"] ?? (entry.artist as { name?: string }).name ?? "")
      : String(entry.artist ?? "");
  const album =
    typeof entry.album === "object" && entry.album != null
      ? String((entry.album as { "#text"?: string })["#text"] ?? "")
      : entry.album != null
        ? String(entry.album)
        : null;
  const date = entry.date as { uts?: string; "#text"?: string } | undefined;
  if (!date?.uts) return null;
  const playedAt = new Date(Number(date.uts) * 1000);
  const artistObj = typeof entry.artist === "object" ? (entry.artist as { mbid?: string }) : null;
  const albumObj = typeof entry.album === "object" ? (entry.album as { mbid?: string }) : null;
  return {
    track: String(entry.name ?? "Unknown"),
    artist: artist || "Unknown",
    album: album || null,
    playedAt,
    artistMbid: artistObj?.mbid && artistObj.mbid !== "" ? artistObj.mbid : null,
    albumMbid: albumObj?.mbid && albumObj.mbid !== "" ? albumObj.mbid : null,
    imageUrl: pickImage(entry.image as Array<{ "#text": string; size: string }> | undefined),
  };
}

async function lastfmGet(
  apiKey: string,
  params: Record<string, string>,
  rateLimitAttempt = 0,
): Promise<Record<string, unknown>> {
  const search = new URLSearchParams({ ...params, api_key: apiKey, format: "json" });
  const res = await fetch(`${LASTFM_BASE}?${search}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 429) {
    if (rateLimitAttempt >= MAX_RATE_LIMIT_RETRIES) {
      throw new Error("Last.fm rate limit exceeded");
    }
    const backoffMs = Math.min(2000 * 2 ** rateLimitAttempt, 60_000);
    await sleep(backoffMs);
    return lastfmGet(apiKey, params, rateLimitAttempt + 1);
  }
  if (!res.ok) throw new Error(`Last.fm HTTP ${res.status}`);
  const body = (await res.json()) as { error?: number; message?: string };
  if (body.error != null) {
    throw new Error(body.message ?? `Last.fm error ${body.error}`);
  }
  return body as Record<string, unknown>;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getRecentTracksPage(
  apiKey: string,
  username: string,
  page: number,
  opts?: { from?: number; to?: number },
): Promise<LastfmRecentPage> {
  const params: Record<string, string> = {
    method: "user.getRecentTracks",
    user: username,
    limit: "200",
    extended: "1",
    page: String(page),
  };
  if (opts?.from != null) params.from = String(opts.from);
  if (opts?.to != null) params.to = String(opts.to);

  const body = await lastfmGet(apiKey, params);
  const recenttracks = body.recenttracks as Record<string, unknown> | undefined;
  const attr = recenttracks?.["@attr"] as
    | { page?: string; totalPages?: string }
    | undefined;
  const raw = recenttracks?.track;
  const list = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
  const tracks = list
    .map((t) => parseTrack(t as Record<string, unknown>))
    .filter((t): t is LastfmRecentTrack => t != null);

  return {
    tracks,
    page: Number(attr?.page ?? page),
    totalPages: Number(attr?.totalPages ?? 1),
  };
}

export async function getUserPlaycount(apiKey: string, username: string): Promise<number> {
  const body = await lastfmGet(apiKey, { method: "user.getInfo", user: username });
  const user = body.user as { playcount?: string } | undefined;
  return Number(user?.playcount ?? 0);
}

export async function fetchAllRecentTracks(
  apiKey: string,
  username: string,
  opts?: { from?: number; onPage?: (page: number, totalPages: number) => void },
): Promise<LastfmRecentTrack[]> {
  const all: LastfmRecentTrack[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await getRecentTracksPage(apiKey, username, page, { from: opts?.from });
    all.push(...result.tracks);
    totalPages = result.totalPages;
    opts?.onPage?.(page, totalPages);
    if (page >= totalPages) break;
    page += 1;
    await sleep(PAGE_DELAY_MS);
  } while (page <= totalPages);
  return all;
}
