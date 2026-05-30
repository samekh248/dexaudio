import { Howl, Howler } from "howler";

export interface AudioEngineEvents {
  onLoaded(durationMs: number): void;
  onPlay(): void;
  onPause(): void;
  onEnded(): void;
  onError(error: number | string): void;
  onStall(): void;
  onResume(): void;
  onProgress(positionMs: number): void;
}

export interface AudioEngine {
  load(src: string, formatHints: string[], events: AudioEngineEvents): void;
  /** Rebind the event handlers on an already-loaded engine (used on staged handoff). */
  setEvents(events: AudioEngineEvents): void;
  play(): void;
  pause(): void;
  stop(): void;
  seek(ms: number): void;
  getPositionMs(): number;
  getDurationMs(): number;
  setVolume(v: number): void;
  fadeVolume(from: number, to: number, ms: number): void;
  state(): "unloaded" | "loading" | "loaded";
  destroy(): void;
}

export function createHowlerAudioEngine(): AudioEngine {
  let howl: Howl | null = null;
  let blobUrl: string | null = null;
  let events: AudioEngineEvents | null = null;
  let volume = 1;
  let lastProgressMs = 0;
  let stallWatchId: ReturnType<typeof setInterval> | null = null;
  let stalled = false;

  const clearStallWatch = () => {
    if (stallWatchId !== null) {
      clearInterval(stallWatchId);
      stallWatchId = null;
    }
    stalled = false;
  };

  const startStallWatch = () => {
    clearStallWatch();
    stallWatchId = setInterval(() => {
      if (!howl?.playing()) return;
      const pos = Math.round((howl.seek() as number) * 1000);
      if (pos > lastProgressMs) {
        lastProgressMs = pos;
        if (stalled) {
          stalled = false;
          events?.onResume();
        }
        events?.onProgress(pos);
      } else if (!stalled) {
        stalled = true;
        events?.onStall();
      }
    }, 500);
  };

  return {
    load(src: string, formatHints: string[], ev: AudioEngineEvents) {
      this.destroy();
      events = ev;
      lastProgressMs = 0;
      if (src.startsWith("blob:")) blobUrl = src;

      howl = new Howl({
        src: [src],
        format: formatHints,
        html5: true,
        volume,
        onload: () => {
          const d = howl?.duration() ?? 0;
          events?.onLoaded(Number.isFinite(d) ? Math.round(d * 1000) : 0);
        },
        onplay: () => {
          events?.onPlay();
          startStallWatch();
        },
        onpause: () => {
          clearStallWatch();
          events?.onPause();
        },
        onstop: () => {
          clearStallWatch();
          events?.onPause();
        },
        onend: () => {
          clearStallWatch();
          events?.onEnded();
        },
        onloaderror: (_id, err) => {
          clearStallWatch();
          events?.onError(typeof err === "number" || typeof err === "string" ? err : 4);
        },
        onplayerror: (_id, err) => {
          events?.onError(typeof err === "number" || typeof err === "string" ? err : 4);
        },
      });
    },

    setEvents(ev: AudioEngineEvents) {
      events = ev;
    },

    play() {
      const result = howl?.play() as unknown;
      if (result && typeof (result as Promise<void>).catch === "function") {
        void (result as Promise<void>).catch((err: unknown) => {
          if (Howler.ctx?.state === "suspended") {
            events?.onError(typeof err === "string" ? err : "autoplay blocked");
          }
        });
      }
    },

    pause() {
      howl?.pause();
    },

    stop() {
      howl?.stop();
    },

    seek(ms: number) {
      howl?.seek(ms / 1000);
      lastProgressMs = ms;
      events?.onProgress(ms);
    },

    getPositionMs() {
      if (!howl) return 0;
      return Math.round((howl.seek() as number) * 1000);
    },

    getDurationMs() {
      if (!howl) return 0;
      const d = howl.duration();
      return Number.isFinite(d) ? Math.round(d * 1000) : 0;
    },

    setVolume(v: number) {
      volume = v;
      howl?.volume(v);
    },

    fadeVolume(from: number, to: number, ms: number) {
      if (!howl) return;
      howl.volume(from);
      howl.fade(from, to, ms);
    },

    state() {
      return howl?.state() ?? "unloaded";
    },

    destroy() {
      clearStallWatch();
      howl?.unload();
      howl = null;
      if (blobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
      blobUrl = null;
      events = null;
    },
  };
}
