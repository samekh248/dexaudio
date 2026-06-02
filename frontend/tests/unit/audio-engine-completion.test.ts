import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createHowlerAudioEngine } from "@/lib/audio-engine";

const { mockHowlInstances, HowlMock } = vi.hoisted(() => {
  const mockHowlInstances: Array<{
    handlers: Record<string, () => void>;
    playing: boolean;
    state: string;
    seekPos: number;
    duration: number;
    node: HTMLAudioElement;
  }> = [];

  class HowlMock {
    handlers: Record<string, () => void> = {};
    _isPlaying = false;
    _state: "unloaded" | "loaded" = "unloaded";
    seekPos = 0;
    trackDuration = 180;
    node: HTMLAudioElement;
    _sounds: Array<{ _node: HTMLAudioElement }>;

    constructor(opts: Record<string, unknown>) {
      this.node = document.createElement("audio");
      this._sounds = [{ _node: this.node }];
      Object.assign(this.handlers, {
        onload: opts.onload,
        onplay: opts.onplay,
        onend: opts.onend,
      });
      mockHowlInstances.push(this as unknown as (typeof mockHowlInstances)[0]);
    }

    play() {
      this._isPlaying = true;
      this._state = "loaded";
      this.handlers.onplay?.();
      return undefined;
    }

    pause() {
      this._isPlaying = false;
    }

    playing() {
      return this._isPlaying;
    }

    state() {
      return this._state;
    }

    seek(pos?: number) {
      if (pos !== undefined) {
        this.seekPos = pos;
        this.node.currentTime = pos;
      }
      return this.seekPos;
    }

    duration() {
      return this.trackDuration;
    }

    volume() {}
    fade() {}
    unload() {
      this._state = "unloaded";
    }
  }

  return { mockHowlInstances, HowlMock };
});

vi.mock("howler", () => ({
  Howl: HowlMock,
  Howler: { ctx: { state: "running" } },
}));

describe("audio engine completion in background", () => {
  beforeEach(() => {
    mockHowlInstances.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits onEnded when timeupdate reaches the track duration", () => {
    const engine = createHowlerAudioEngine();
    let ended = false;

    engine.load("https://example.com/track.mp3", ["mp3"], {
      onLoaded: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {
        ended = true;
      },
      onError: () => {},
      onStall: () => {},
      onResume: () => {},
      onProgress: () => {},
    });

    const howl = mockHowlInstances[0]!;
    howl._state = "loaded";
    howl.handlers.onload?.();
    engine.play();

    Object.defineProperty(howl.node, "paused", { value: false, configurable: true });
    Object.defineProperty(howl.node, "ended", { value: false, configurable: true });
    Object.defineProperty(howl.node, "duration", { value: 180, configurable: true });
    howl.node.currentTime = 179.95;
    howl.node.dispatchEvent(new Event("timeupdate"));

    expect(ended).toBe(true);
  });

  it("syncEndedIfComplete emits onEnded when the media element has ended", () => {
    const engine = createHowlerAudioEngine();
    let ended = false;

    engine.load("https://example.com/track.mp3", ["mp3"], {
      onLoaded: () => {},
      onPlay: () => {},
      onPause: () => {},
      onEnded: () => {
        ended = true;
      },
      onError: () => {},
      onStall: () => {},
      onResume: () => {},
      onProgress: () => {},
    });

    const howl = mockHowlInstances[0]!;
    howl._state = "loaded";
    howl.handlers.onload?.();
    engine.play();

    howl.node.currentTime = 180;
    Object.defineProperty(howl.node, "ended", { value: true, configurable: true });
    howl._isPlaying = false;

    engine.syncEndedIfComplete();
    expect(ended).toBe(true);
  });
});
