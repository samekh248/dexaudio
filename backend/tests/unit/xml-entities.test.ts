import { describe, expect, it } from "vitest";
import { decodeXmlEntities } from "../../src/lib/xml-entities.js";
import {
  parseAlbumFromMetadata,
  parseAlbumPageXml,
  parseTrackFromMetadata,
} from "../../src/services/plex/plex-client.js";

describe("decodeXmlEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeXmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeXmlEntities("Don&#39;t Stop")).toBe("Don't Stop");
    expect(decodeXmlEntities("Caf&#233;")).toBe("Café");
    expect(decodeXmlEntities("Pi&#x3C0;")).toBe("Piπ");
  });

  it("decodes double-encoded entities", () => {
    expect(decodeXmlEntities("Don&amp;#39;t")).toBe("Don't");
  });
});

describe("plex metadata entity decoding", () => {
  it("decodes album and track titles from XML attributes", () => {
    const album = parseAlbumFromMetadata({
      ratingKey: "1",
      title: "Rock &amp; Roll",
      parentTitle: "Guns &amp; Roses",
    });
    expect(album.title).toBe("Rock & Roll");
    expect(album.artist).toBe("Guns & Roses");

    const track = parseTrackFromMetadata({
      ratingKey: "2",
      title: "Can&#39;t Stop",
      grandparentTitle: "Red Hot Chili Peppers",
      parentTitle: "By the Way",
      codec: "mp3",
    });
    expect(track.title).toBe("Can't Stop");
    expect(track.album).toBe("By the Way");
  });

  it("decodes titles in album page XML", () => {
    const xml = `<MediaContainer totalSize="1"><Directory ratingKey="1" title="B&amp;B" parentTitle="Artist&#39;s Name"/></MediaContainer>`;
    const page = parseAlbumPageXml(xml, 1);
    expect(page.items[0]?.title).toBe("B&B");
    expect(page.items[0]?.artist).toBe("Artist's Name");
  });
});
