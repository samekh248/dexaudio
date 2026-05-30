import { describe, expect, it } from "vitest";
import { FakeAudioEngine } from "../helpers/fake-audio-engine";

describe("FakeAudioEngine lifecycle", () => {
  it("loads, plays, pauses, and ends", () => {
    const engine = new FakeAudioEngine();
    let loaded = false;
    let played = false;
    let paused = false;
    let ended = false;

    engine.load("http://example.com/track.mp3", ["mp3"], {
      onLoaded: (d) => {
        loaded = true;
        expect(d).toBe(180_000);
      },
      onPlay: () => {
        played = true;
      },
      onPause: () => {
        paused = true;
      },
      onEnded: () => {
        ended = true;
      },
      onError: () => {},
      onStall: () => {},
      onResume: () => {},
      onProgress: () => {},
    });

    engine.simulateLoaded();
    expect(loaded).toBe(true);
    expect(engine.state()).toBe("loaded");

    engine.play();
    expect(played).toBe(true);
    expect(engine.isPlaying()).toBe(true);

    engine.pause();
    expect(paused).toBe(true);

    engine.simulateEnded();
    expect(ended).toBe(true);
  });

  it("tracks seek position", () => {
    const engine = new FakeAudioEngine();
    engine.load("x", ["mp3"], {
      onLoaded: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onError: () => {},
      onStall: () => {},
      onResume: () => {},
      onProgress: () => {},
    });
    engine.simulateLoaded();
    engine.seek(5000);
    expect(engine.getPositionMs()).toBe(5000);
  });
});
