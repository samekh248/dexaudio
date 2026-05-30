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

  it("routes events to rebound handlers after a staged handoff (no stale stubs)", () => {
    const staged = new FakeAudioEngine();

    // Preload phase: lightweight stub handlers that swallow everything.
    let stubErrors = 0;
    staged.load("next", ["mp3"], {
      onLoaded: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onError: () => {
        stubErrors += 1;
      },
      onStall: () => {},
      onResume: () => {},
      onProgress: () => {},
    });
    staged.simulateLoaded();

    // Promotion phase: rebind the full lifecycle handlers.
    let liveErrors = 0;
    let liveStalls = 0;
    staged.setEvents({
      onLoaded: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {},
      onError: () => {
        liveErrors += 1;
      },
      onStall: () => {
        liveStalls += 1;
      },
      onResume: () => {},
      onProgress: () => {},
    });

    staged.simulateError();
    staged.simulateStall();

    // The stale preload stub must no longer receive events; the active
    // (rebound) handlers must.
    expect(stubErrors).toBe(0);
    expect(liveErrors).toBe(1);
    expect(liveStalls).toBe(1);
  });
});
