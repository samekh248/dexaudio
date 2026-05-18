export interface DiscogsConfig {
  username: string;
  token: string;
}

export interface DiscogsRelease {
  id: number;
  title: string;
  artist: string;
  year?: number;
  format?: string;
}

export async function fetchCollection(config: DiscogsConfig): Promise<DiscogsRelease[]> {
  const releases: DiscogsRelease[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const url = `https://api.discogs.com/users/${encodeURIComponent(config.username)}/collection/folders/0/releases?page=${page}&per_page=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Discogs token=${config.token}`,
        "User-Agent": "Dexaudio/1.0",
      },
    });
    if (res.status === 429) throw new RateLimitError();
    if (!res.ok) break;

    const data = (await res.json()) as {
      releases: Array<{
        basic_information: {
          id: number;
          title: string;
          year?: number;
          formats?: Array<{ name: string }>;
          artists?: Array<{ name: string }>;
        };
      }>;
      pagination: { pages: number };
    };

    for (const item of data.releases ?? []) {
      const info = item.basic_information;
      releases.push({
        id: info.id,
        title: info.title,
        artist: info.artists?.[0]?.name ?? "Unknown",
        year: info.year,
        format: info.formats?.[0]?.name,
      });
    }

    hasMore = page < (data.pagination?.pages ?? 1);
    page += 1;
  }

  return releases;
}

export class RateLimitError extends Error {
  constructor() {
    super("Discogs rate limit exceeded");
    this.name = "RateLimitError";
  }
}
