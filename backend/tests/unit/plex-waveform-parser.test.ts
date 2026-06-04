import { describe, expect, it } from "vitest";
import {
  normalizeLevelSamples,
  parseAudioStreamIdFromTrackXml,
  parsePlexLevelValuesFromXml,
} from "../../src/services/plex/plex-client.js";

describe("plex waveform parser", () => {
  it("parses first audio stream id from track XML", () => {
    const xml = `<MediaContainer>
      <Track ratingKey="1" title="Song" duration="240000">
        <Media>
          <Part key="/library/parts/1/file.flac"/>
          <Stream streamType="1" id="10"/>
          <Stream streamType="2" id="99" codec="flac"/>
        </Media>
      </Track>
    </MediaContainer>`;
    expect(parseAudioStreamIdFromTrackXml(xml)).toBe("99");
  });

  it("returns undefined when no audio stream", () => {
    const xml = `<Track ratingKey="1"><Media><Part key="/library/parts/1/a.flac"/></Media></Track>`;
    expect(parseAudioStreamIdFromTrackXml(xml)).toBeUndefined();
  });

  it("prefers selected audio stream", () => {
    const xml = `<Track><Media>
      <Stream streamType="2" id="1"/>
      <Stream streamType="2" id="2" selected="1"/>
    </Media></Track>`;
    expect(parseAudioStreamIdFromTrackXml(xml)).toBe("2");
  });

  it("parses level samples from Plex XML loudness response", () => {
    const xml = `<MediaContainer totalSamples="2400">
      <Level v="-30.0"/><Level v="-20.0"/><Level v="-10.0"/>
    </MediaContainer>`;
    expect(parsePlexLevelValuesFromXml(xml)).toEqual({
      values: [-30, -20, -10],
      totalSamples: 2400,
    });
  });

  it("normalizes dB to peak-relative linear amplitude (0–1)", () => {
    const out = normalizeLevelSamples([-30, -20, -10]);
    expect(out[2]).toBe(1);
    expect(out[0]).toBeCloseTo(0.1, 5);
    expect(out[1]).toBeCloseTo(0.316227766, 5);
    expect(normalizeLevelSamples([-5, -5, -5])).toEqual([1, 1, 1]);
    expect(normalizeLevelSamples([])).toEqual([]);
  });

  it("keeps visible variation in loud sections (3 dB below peak)", () => {
    const loudSection = normalizeLevelSamples([-8, -6, -5]);
    expect(loudSection[2]).toBe(1);
    expect(loudSection[0]).toBeCloseTo(0.708, 2);
    expect(loudSection[1]).toBeCloseTo(0.891, 2);
  });
});
