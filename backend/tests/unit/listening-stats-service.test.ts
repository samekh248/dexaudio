import { describe, expect, it } from "vitest";
import {
  alignToBucketStart,
  emptyOverview,
  getPeriodSince,
  inclusiveDaySpan,
  mapPlexTopStatsToOverview,
  normalizeTz,
  parseStatsPeriod,
  resolveSeriesRange,
  selectGranularity,
  zeroFillSeries,
} from "../../src/services/lastfm/listening-stats-service.js";

describe("listening-stats-service helpers", () => {
  it("normalizes invalid tz to UTC", () => {
    expect(normalizeTz("Not/A/Zone")).toBe("UTC");
    expect(normalizeTz("America/Denver")).toBe("America/Denver");
  });

  it("parses stats periods", () => {
    expect(parseStatsPeriod("7d")).toBe("7d");
    expect(() => parseStatsPeriod("bad")).toThrow();
  });

  it("computes period since for 7d", () => {
    const now = new Date("2026-05-31T12:00:00Z");
    const since = getPeriodSince("7d", now);
    expect(since).not.toBeNull();
    expect(now.getTime() - since!.getTime()).toBeCloseTo(7 * 86400000, -3);
  });

  it("returns null since for all time", () => {
    expect(getPeriodSince("all")).toBeNull();
  });

  it("selects granularity by period", () => {
    expect(selectGranularity("7d")).toBe("day");
    expect(selectGranularity("6m")).toBe("week");
    expect(selectGranularity("12m")).toBe("month");
  });

  it("maps plex top stats to overview", () => {
    const overview = mapPlexTopStatsToOverview("1m", {
      songs: [
        {
          track: {
            id: "1",
            title: "Song",
            artist: "Artist",
            album: "Album",
            durationMs: 1000,
            format: "mp3",
            playCount: 5,
          },
          playCount: 5,
        },
      ],
      albums: [],
      artists: [{ name: "Artist", playCount: 5 }],
    });
    expect(overview.source).toBe("plex");
    expect(overview.totalPlays).toBe(5);
    expect(overview.topTracks[0]?.label).toBe("Song");
  });

  it("returns zeroed empty overview", () => {
    const o = emptyOverview("3m", "plex");
    expect(o.totalPlays).toBe(0);
    expect(o.topArtists).toEqual([]);
  });

  it("aligns week buckets to Monday (PostgreSQL date_trunc)", () => {
    const sunday = new Date("2026-05-31T15:00:00.000Z");
    const aligned = alignToBucketStart(sunday, "week");
    expect(aligned.toISOString().slice(0, 10)).toBe("2026-05-25");
  });

  it("aligns month buckets to first of month", () => {
    const mid = new Date("2026-05-15T12:00:00.000Z");
    const aligned = alignToBucketStart(mid, "month");
    expect(aligned.toISOString().slice(0, 10)).toBe("2026-05-01");
  });

  it("computes inclusive day span", () => {
    const start = new Date("2026-05-01T00:00:00.000Z");
    const end = new Date("2026-05-03T00:00:00.000Z");
    expect(inclusiveDaySpan(start, end)).toBe(3);
    expect(inclusiveDaySpan(start, start)).toBe(1);
  });

  it("resolveSeriesRange for all period uses full bucket span", () => {
    const buckets = [
      { bucket: "2024-01-01", count: 5 },
      { bucket: "2024-06-01", count: 10 },
    ];
    const range = resolveSeriesRange(buckets, null, new Date("2026-05-31"), "month", "all");
    expect(range).toEqual({
      start: new Date("2024-01-01T00:00:00.000Z"),
      end: new Date("2024-06-01T00:00:00.000Z"),
    });
  });

  it("zeroFillSeries fills month buckets without truncating to 30 days", () => {
    const buckets = [
      { bucket: "2024-01-01", count: 5 },
      { bucket: "2024-06-01", count: 10 },
    ];
    const filled = zeroFillSeries(
      buckets,
      new Date("2024-01-01T00:00:00.000Z"),
      new Date("2024-06-01T00:00:00.000Z"),
      "month",
    );
    expect(filled.length).toBe(6);
    expect(filled[0]).toEqual({ bucket: "2024-01-01", count: 5 });
    expect(filled[5]).toEqual({ bucket: "2024-06-01", count: 10 });
    expect(filled[1]).toEqual({ bucket: "2024-02-01", count: 0 });
  });

  it("zeroFillSeries aligns weekly start to Monday", () => {
    const filled = zeroFillSeries(
      [{ bucket: "2026-05-25", count: 3 }],
      new Date("2026-05-27T12:00:00.000Z"),
      new Date("2026-06-08T12:00:00.000Z"),
      "week",
    );
    expect(filled[0]?.bucket).toBe("2026-05-25");
    expect(filled.length).toBeGreaterThan(1);
  });
});
