import type {
  ListeningOverview,
  ListeningPatterns,
  StatsGranularity,
  StatsPeriod,
  StatsSource,
  TopEntry,
  TopStats,
} from "@dexaudio/shared-types";
import { StatsPeriodSchema } from "@dexaudio/shared-types";
import { and, count, desc, gte, max, min, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { lastfmAccounts, scrobbles } from "../../db/schema.js";
import * as topStats from "../plex/top-stats-service.js";
import type { PlexConfig } from "../plex/plex-client.js";

type Db = ReturnType<typeof getDb>;

const PERIOD_DAYS: Record<Exclude<StatsPeriod, "all">, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "12m": 365,
};

export function normalizeTz(tz: string | undefined): string {
  if (!tz?.trim()) return "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Embed a validated IANA zone as SQL text (GROUP BY must match SELECT exactly). */
function tzSql(tz: string) {
  return sql.raw(`'${tz.replace(/'/g, "''")}'`);
}

function truncUnitSql(unit: "day" | "week" | "month") {
  return sql.raw(`'${unit}'`);
}

export function parseStatsPeriod(value: string): StatsPeriod {
  return StatsPeriodSchema.parse(value);
}

export function getPeriodSince(period: StatsPeriod, now = new Date()): Date | null {
  if (period === "all") return null;
  const days = PERIOD_DAYS[period];
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function selectGranularity(period: StatsPeriod): StatsGranularity {
  if (period === "6m") return "week";
  if (period === "12m" || period === "all") return "month";
  return "day";
}

export function periodDays(period: StatsPeriod): number {
  if (period === "all") return 1;
  return PERIOD_DAYS[period];
}

/** Align a date to the start of its bucket (matches PostgreSQL date_trunc week=Monday). */
export function alignToBucketStart(date: Date, granularity: StatsGranularity): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  if (granularity === "day") return d;
  if (granularity === "week") {
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  }
  d.setUTCDate(1);
  return d;
}

function bucketKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function advanceBucket(cursor: Date, granularity: StatsGranularity): void {
  if (granularity === "day") {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } else if (granularity === "week") {
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  } else {
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
}

/** Inclusive day span between two dates (minimum 1). */
export function inclusiveDaySpan(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

export function resolveSeriesRange(
  buckets: { bucket: string; count: number }[],
  since: Date | null,
  now: Date,
  granularity: StatsGranularity,
  period: StatsPeriod,
): { start: Date; end: Date } | null {
  if (buckets.length === 0) return null;

  const first = new Date(`${buckets[0]!.bucket}T00:00:00.000Z`);
  const last = new Date(`${buckets[buckets.length - 1]!.bucket}T00:00:00.000Z`);

  if (period === "all") {
    return { start: first, end: last };
  }

  const end = alignToBucketStart(now, granularity);
  const start = since
    ? alignToBucketStart(since, granularity)
    : alignToBucketStart(first, granularity);
  return { start, end };
}

export async function resolveStatsSource(db: Db): Promise<StatsSource> {
  const row = await db.select({ id: scrobbles.id }).from(scrobbles).limit(1);
  return row.length > 0 ? "lastfm" : "plex";
}

function periodFilter(since: Date | null) {
  return since ? gte(scrobbles.playedAt, since) : sql`true`;
}

export function mapPlexTopStatsToOverview(period: StatsPeriod, stats: TopStats): ListeningOverview {
  const totalPlays = stats.songs.reduce((s, x) => s + x.playCount, 0);
  const topTracks: TopEntry[] = stats.songs.slice(0, 10).map((s) => ({
    label: s.track.title,
    sub: s.track.artist,
    count: s.playCount,
  }));
  const topArtists: TopEntry[] = stats.artists.slice(0, 10).map((a) => ({
    label: a.name,
    count: a.playCount,
  }));
  const topAlbums: TopEntry[] = stats.albums.slice(0, 10).map((a) => ({
    label: a.album.title,
    sub: a.album.artist,
    count: a.playCount,
  }));

  return {
    period,
    source: "plex",
    totalPlays,
    totalPlaysAllTime: totalPlays,
    uniqueArtists: new Set(stats.songs.map((s) => s.track.artist)).size,
    uniqueAlbums: new Set(stats.songs.map((s) => s.track.album)).size,
    uniqueTracks: stats.songs.length,
    avgPlaysPerDay: totalPlays / Math.max(1, periodDays(period)),
    busiestDate: null,
    busiestWeekday: null,
    topArtists,
    topAlbums,
    topTracks,
  };
}

export function emptyOverview(period: StatsPeriod, source: StatsSource): ListeningOverview {
  return {
    period,
    source,
    totalPlays: 0,
    totalPlaysAllTime: 0,
    uniqueArtists: 0,
    uniqueAlbums: 0,
    uniqueTracks: 0,
    avgPlaysPerDay: 0,
    busiestDate: null,
    busiestWeekday: null,
    topArtists: [],
    topAlbums: [],
    topTracks: [],
  };
}

async function countPlays(db: Db, since: Date | null): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(scrobbles)
    .where(periodFilter(since));
  return Number(rows[0]?.n ?? 0);
}

async function playSpanDays(db: Db, since: Date | null): Promise<number> {
  const rows = await db
    .select({
      minAt: min(scrobbles.playedAt),
      maxAt: max(scrobbles.playedAt),
    })
    .from(scrobbles)
    .where(periodFilter(since));
  const minAt = rows[0]?.minAt;
  const maxAt = rows[0]?.maxAt;
  if (!minAt || !maxAt) return 1;
  return inclusiveDaySpan(minAt, maxAt);
}

async function countDistinct(
  db: Db,
  column: typeof scrobbles.artist | typeof scrobbles.album | typeof scrobbles.track,
  since: Date | null,
): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(distinct ${column})::int` })
    .from(scrobbles)
    .where(periodFilter(since));
  return Number(rows[0]?.n ?? 0);
}

async function topGroup(
  db: Db,
  groupCol: typeof scrobbles.artist | typeof scrobbles.album | typeof scrobbles.track,
  subCol: typeof scrobbles.artist | typeof scrobbles.album | null,
  since: Date | null,
): Promise<TopEntry[]> {
  const subExpr = subCol ? max(subCol) : sql<string | null>`null`;
  const rows = await db
    .select({
      label: groupCol,
      sub: subExpr,
      count: sql<number>`count(*)::int`,
      imageUrl: max(scrobbles.imageUrl),
    })
    .from(scrobbles)
    .where(and(periodFilter(since), sql`${groupCol} is not null`))
    .groupBy(groupCol)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return rows.map((r) => ({
    label: String(r.label),
    sub: r.sub != null ? String(r.sub) : undefined,
    count: Number(r.count),
    imageUrl: r.imageUrl ?? undefined,
  }));
}

async function busiestDate(
  db: Db,
  since: Date | null,
  tz: string,
): Promise<ListeningOverview["busiestDate"]> {
  const dayExpr = sql<string>`date_trunc('day', ${scrobbles.playedAt} at time zone ${tzSql(tz)})::date::text`;
  const rows = await db
    .select({ date: dayExpr, count: sql<number>`count(*)::int` })
    .from(scrobbles)
    .where(periodFilter(since))
    .groupBy(dayExpr)
    .orderBy(desc(sql`count(*)`))
    .limit(1);
  const top = rows[0];
  if (!top?.date) return null;
  return { date: top.date, count: Number(top.count) };
}

async function busiestWeekday(
  db: Db,
  since: Date | null,
  tz: string,
): Promise<ListeningOverview["busiestWeekday"]> {
  const dowExpr = sql<number>`extract(dow from ${scrobbles.playedAt} at time zone ${tzSql(tz)})::int`;
  const rows = await db
    .select({ weekday: dowExpr, count: sql<number>`count(*)::int` })
    .from(scrobbles)
    .where(periodFilter(since))
    .groupBy(dowExpr)
    .orderBy(desc(sql`count(*)`))
    .limit(1);
  const top = rows[0];
  if (top == null) return null;
  return { weekday: Number(top.weekday), count: Number(top.count) };
}

export async function getListeningOverview(
  db: Db,
  opts: { period: StatsPeriod; tz: string },
  plexConfig: PlexConfig | null,
): Promise<ListeningOverview> {
  const tz = normalizeTz(opts.tz);
  const source = await resolveStatsSource(db);
  if (source === "plex") {
    if (!plexConfig) return emptyOverview(opts.period, "plex");
    const stats = await topStats.aggregateTopStats(plexConfig);
    const hasData =
      stats.songs.length > 0 || stats.albums.length > 0 || stats.artists.length > 0;
    if (!hasData) return emptyOverview(opts.period, "plex");
    return mapPlexTopStatsToOverview(opts.period, stats);
  }

  const since = getPeriodSince(opts.period);
  const totalPlays = await countPlays(db, since);
  const totalPlaysAllTime = await countPlays(db, null);

  if (totalPlays === 0 && totalPlaysAllTime === 0) {
    return emptyOverview(opts.period, "lastfm");
  }

  const days =
    opts.period === "all" ? await playSpanDays(db, since) : periodDays(opts.period);
  const [topArtists, topAlbums, topTracks, busiestDateVal, busiestWeekdayVal] = await Promise.all([
    topGroup(db, scrobbles.artist, null, since),
    topGroup(db, scrobbles.album, scrobbles.artist, since),
    topGroup(db, scrobbles.track, scrobbles.artist, since),
    busiestDate(db, since, tz),
    busiestWeekday(db, since, tz),
  ]);

  return {
    period: opts.period,
    source: "lastfm",
    totalPlays,
    totalPlaysAllTime,
    uniqueArtists: await countDistinct(db, scrobbles.artist, since),
    uniqueAlbums: await countDistinct(db, scrobbles.album, since),
    uniqueTracks: await countDistinct(db, scrobbles.track, since),
    avgPlaysPerDay: totalPlays / Math.max(1, days),
    busiestDate: busiestDateVal,
    busiestWeekday: busiestWeekdayVal,
    topArtists,
    topAlbums,
    topTracks,
  };
}

export function zeroFillSeries(
  buckets: { bucket: string; count: number }[],
  start: Date,
  end: Date,
  granularity: StatsGranularity,
): { bucket: string; count: number }[] {
  const map = new Map(buckets.map((b) => [b.bucket, b.count]));
  const out: { bucket: string; count: number }[] = [];
  const cursor = alignToBucketStart(start, granularity);
  const endAligned = alignToBucketStart(end, granularity);
  while (cursor <= endAligned) {
    const key = bucketKey(cursor);
    out.push({ bucket: key, count: map.get(key) ?? 0 });
    advanceBucket(cursor, granularity);
  }
  return out.length > 0 ? out : buckets;
}

export async function getListeningPatterns(
  db: Db,
  opts: { period: StatsPeriod; tz: string; granularity?: StatsGranularity },
): Promise<ListeningPatterns> {
  const tz = normalizeTz(opts.tz);
  const source = await resolveStatsSource(db);
  const granularity = opts.granularity ?? selectGranularity(opts.period);
  const emptyPatterns = (): ListeningPatterns => ({
    period: opts.period,
    source,
    granularity,
    playsOverTime: [],
    clock: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
    weekday: Array.from({ length: 7 }, (_, weekday) => ({ weekday, count: 0 })),
    calendar: [],
  });

  if (source === "plex") return emptyPatterns();

  const since = getPeriodSince(opts.period);
  const truncUnit = granularity === "month" ? "month" : granularity === "week" ? "week" : "day";
  const bucketExpr = sql<string>`date_trunc(${truncUnitSql(truncUnit)}, ${scrobbles.playedAt} at time zone ${tzSql(tz)})::date::text`;

  const seriesRows = await db
    .select({ bucket: bucketExpr, count: sql<number>`count(*)::int` })
    .from(scrobbles)
    .where(periodFilter(since))
    .groupBy(bucketExpr)
    .orderBy(bucketExpr);

  const hourExpr = sql<number>`extract(hour from ${scrobbles.playedAt} at time zone ${tzSql(tz)})::int`;
  const clockRows = await db
    .select({ hour: hourExpr, count: sql<number>`count(*)::int` })
    .from(scrobbles)
    .where(periodFilter(since))
    .groupBy(hourExpr);

  const dowExpr = sql<number>`extract(dow from ${scrobbles.playedAt} at time zone ${tzSql(tz)})::int`;
  const weekdayRows = await db
    .select({ weekday: dowExpr, count: sql<number>`count(*)::int` })
    .from(scrobbles)
    .where(periodFilter(since))
    .groupBy(dowExpr);

  const dayExpr = sql<string>`date_trunc('day', ${scrobbles.playedAt} at time zone ${tzSql(tz)})::date::text`;
  const calendarRows = await db
    .select({ bucket: dayExpr, count: sql<number>`count(*)::int` })
    .from(scrobbles)
    .where(periodFilter(since))
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  const clock = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: Number(clockRows.find((r) => Number(r.hour) === hour)?.count ?? 0),
  }));
  const weekday = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: Number(weekdayRows.find((r) => Number(r.weekday) === weekday)?.count ?? 0),
  }));

  const bucketData = seriesRows.map((r) => ({
    bucket: String(r.bucket),
    count: Number(r.count),
  }));
  const now = new Date();
  const range = resolveSeriesRange(bucketData, since, now, granularity, opts.period);
  const playsOverTime = range
    ? zeroFillSeries(bucketData, range.start, range.end, granularity)
    : bucketData;

  return {
    period: opts.period,
    source: "lastfm",
    granularity,
    playsOverTime,
    clock,
    weekday,
    calendar: calendarRows.map((r) => ({
      bucket: String(r.bucket),
      count: Number(r.count),
    })),
  };
}

export async function getLastfmSyncStatus(
  db: Db,
): Promise<import("@dexaudio/shared-types").LastfmSyncStatus> {
  const rows = await db.select().from(lastfmAccounts).limit(1);
  const acc = rows[0];
  if (!acc) {
    return { connected: false, status: "idle", syncedPages: 0 };
  }
  return {
    connected: acc.connected,
    username: acc.username ?? null,
    status: acc.syncStatus,
    lastSyncedAt: acc.lastSyncedAt?.toISOString() ?? null,
    totalScrobbles: acc.totalScrobbles ?? null,
    syncedPages: acc.syncedPages,
    totalPages: acc.totalPages ?? null,
    lastError: acc.lastError ?? null,
  };
}
