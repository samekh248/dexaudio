import { describe, expect, it, vi } from "vitest";
import { aggregateTopStats, parseTopStatsXml } from "../../src/services/plex/top-stats-service.js";

describe("top-stats-service", () => {
  it("returns empty lists for empty XML", () => {
    const stats = parseTopStatsXml("<MediaContainer/>");
    expect(stats.songs).toEqual([]);
    expect(stats.albums).toEqual([]);
    expect(stats.artists).toEqual([]);
  });

  it("aggregates when plex fetch succeeds", async () => {
    const xml = `<MediaContainer><Track ratingKey="1" title="A" grandparentTitle="Artist" parentTitle="Alb" duration="1000" viewCount="5" codec="mp3"/></MediaContainer>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => xml }));
    const stats = await aggregateTopStats({ serverUrl: "http://plex", token: "t" });
    expect(stats.songs).toHaveLength(1);
  });

  it("returns empty when plex fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const stats = await aggregateTopStats({ serverUrl: "http://plex", token: "t" });
    expect(stats.songs).toEqual([]);
  });

  it("limits songs to top 10 by play count", () => {
    let xml = "<MediaContainer>";
    for (let i = 0; i < 15; i++) {
      xml += `<Track ratingKey="${i}" title="T${i}" grandparentTitle="A" parentTitle="B" duration="1000" viewCount="${i + 1}" codec="mp3"/>`;
    }
    xml += "</MediaContainer>";
    const stats = parseTopStatsXml(xml);
    expect(stats.songs.length).toBeLessThanOrEqual(10);
  });
});
