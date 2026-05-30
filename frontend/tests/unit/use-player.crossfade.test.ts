import { describe, expect, it } from "vitest";
import { FakeAudioEngine } from "../helpers/fake-audio-engine";

describe("crossfade via FakeAudioEngine", () => {
  it("records fadeVolume calls for overlap", () => {
    const outgoing = new FakeAudioEngine();
    const incoming = new FakeAudioEngine();

    outgoing.load("a", ["mp3"], {
      onLoaded: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onError: () => {},
      onStall: () => {},
      onResume: () => {},
      onProgress: () => {},
    });
    incoming.load("b", ["mp3"], {
      onLoaded: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onError: () => {},
      onStall: () => {},
      onResume: () => {},
      onProgress: () => {},
    });
    outgoing.simulateLoaded();
    incoming.simulateLoaded();

    outgoing.fadeVolume(1, 0, 3000);
    incoming.setVolume(0);
    incoming.fadeVolume(0, 1, 3000);

    expect(outgoing.fadeCalls).toEqual([{ from: 1, to: 0, ms: 3000 }]);
    expect(incoming.fadeCalls).toEqual([{ from: 0, to: 1, ms: 3000 }]);
  });
});
