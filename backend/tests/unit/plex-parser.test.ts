import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchAlbums,
  fetchAlbumTracks,
  fetchLibraries,
  fetchSimilarTracks,
  getStreamUrl,
  parseAlbumFromMetadata,
  parseAlbumPageXml,
  parseLibrariesXml,
  parseTrackFromMetadata,
  parseTrackMetadataXml,
  resolveTrackArtPath,
  validateConnection,
} from "../../src/services/plex/plex-client.js";
import { ValidationError } from "../../src/lib/errors.js";
import { parseTopStatsXml } from "../../src/services/plex/top-stats-service.js";

describe("plex-parser", () => {
  it("parses music libraries from XML", () => {
    const xml = `<MediaContainer>
      <Directory key="1" title="Music" type="artist"/>
      <Directory key="2" title="Movies" type="movie"/>
    </MediaContainer>`;
    const libs = parseLibrariesXml(xml);
    expect(libs).toHaveLength(1);
    expect(libs[0]).toEqual({ id: "1", title: "Music", type: "artist" });
  });

  it("resolves track art from parent album when thumb is absent", () => {
    expect(
      resolveTrackArtPath({ parentRatingKey: "50", ratingKey: "99" }),
    ).toBe("/library/metadata/50/thumb");
  });

  it("resolves track art from absolute thumb path", () => {
    expect(resolveTrackArtPath({ thumb: "/library/metadata/50/thumb/1" })).toBe(
      "/library/metadata/50/thumb/1",
    );
  });

  it("reads codec from nested Media element", () => {
    const xml = `<MediaContainer><Track ratingKey="1" title="Song" duration="1000"><Media codec="flac"/></Track></MediaContainer>`;
    const track = parseTrackMetadataXml(xml);
    expect(track?.format).toBe("flac");
  });

  it("parses track metadata with format", () => {
    const track = parseTrackFromMetadata({
      ratingKey: "100",
      title: "Song",
      grandparentTitle: "Artist",
      parentTitle: "Album",
      duration: "180000",
      codec: "flac",
    });
    expect(track.format).toBe("flac");
    expect(track.durationMs).toBe(180000);
  });

  it("detects aac codec", () => {
    const track = parseTrackFromMetadata({
      ratingKey: "1",
      title: "X",
      codec: "aac",
      duration: "1000",
    });
    expect(track.format).toBe("aac");
  });

  it("marks unsupported codecs", () => {
    const track = parseTrackFromMetadata({
      ratingKey: "1",
      title: "X",
      codec: "ape",
      duration: "1000",
    });
    expect(track.format).toBe("unsupported");
  });

  it("detects flac codec", () => {
    const track = parseTrackFromMetadata({
      ratingKey: "1",
      title: "X",
      codec: "flac",
      duration: "1000",
    });
    expect(track.format).toBe("flac");
  });

  it("detects mp3 codec", () => {
    const track = parseTrackFromMetadata({
      ratingKey: "1",
      title: "X",
      codec: "mp3",
      duration: "1000",
    });
    expect(track.format).toBe("mp3");
  });

  it("skips tracks without play count in top stats xml", () => {
    const xml = `<Track ratingKey="1" title="A" duration="1000" viewCount="0" codec="mp3"/>`;
    const stats = parseTopStatsXml(`<MediaContainer>${xml}</MediaContainer>`);
    expect(stats.songs).toHaveLength(0);
  });

  it("parses album metadata", () => {
    const album = parseAlbumFromMetadata({
      ratingKey: "50",
      title: "Album",
      parentTitle: "Artist",
      year: "2020",
    });
    expect(album.year).toBe(2020);
  });

  it("parses album page xml", () => {
    const xml = `<MediaContainer totalSize="2"><Directory ratingKey="1" title="A" parentTitle="B"/></MediaContainer>`;
    const page = parseAlbumPageXml(xml, 1);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
  });

  it("validates connection via fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    expect(await validateConnection({ serverUrl: "http://plex", token: "t" })).toBe(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await validateConnection({ serverUrl: "http://plex", token: "t" })).toBe(false);
  });

  it("returns empty on failed album fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const config = { serverUrl: "http://plex", token: "t" };
    const result = await fetchAlbums(config, "1", 1, 10);
    expect(result.items).toEqual([]);
    expect(await fetchAlbumTracks(config, "1")).toEqual([]);
    expect(await fetchSimilarTracks(config, "1", 5)).toEqual([]);
  });

  it("parses optional album and track fields", () => {
    const album = parseAlbumFromMetadata({ ratingKey: "1", title: "T" });
    expect(album.year).toBeUndefined();
    const track = parseTrackFromMetadata({
      ratingKey: "2",
      title: "S",
      parentRatingKey: "50",
      thumb: "/thumb",
      viewCount: "3",
    });
    expect(track.artUrl).toBe("/thumb");
    expect(track.playCount).toBe(3);
  });

  it("throws when libraries fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(
      fetchLibraries({ serverUrl: "http://plex", token: "t" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("fetches libraries albums tracks similar", async () => {
    const libXml = `<MediaContainer><Directory key="1" title="Music" type="artist"/></MediaContainer>`;
    const albumXml = `<MediaContainer totalSize="1"><Directory ratingKey="10" title="Al" parentTitle="Ar"/></MediaContainer>`;
    const trackXml = `<MediaContainer><Track ratingKey="99" title="T" duration="1000" codec="mp3"/></MediaContainer>`;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, text: async () => libXml })
        .mockResolvedValueOnce({ ok: true, text: async () => albumXml })
        .mockResolvedValueOnce({ ok: true, text: async () => trackXml })
        .mockResolvedValueOnce({ ok: true, text: async () => trackXml }),
    );
    const config = { serverUrl: "http://plex/", token: "t" };
    expect((await fetchLibraries(config)).length).toBe(1);
    expect((await fetchAlbums(config, "1", 1, 10)).items.length).toBe(1);
    expect((await fetchAlbumTracks(config, "10")).length).toBe(1);
    expect((await fetchSimilarTracks(config, "99", 5)).length).toBe(1);
    expect(getStreamUrl(config, "99")).toContain("99");
  });

  it("aggregates top stats from track XML", () => {
    const xml = `<MediaContainer>
      <Track ratingKey="1" title="A" grandparentTitle="Artist" parentTitle="Alb" duration="1000" viewCount="5" codec="mp3"/>
      <Track ratingKey="2" title="B" grandparentTitle="Artist" parentTitle="Alb" duration="1000" viewCount="3" codec="mp3"/>
    </MediaContainer>`;
    const stats = parseTopStatsXml(xml);
    expect(stats.songs).toHaveLength(2);
    expect(stats.artists[0]?.name).toBe("Artist");
  });
});
