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
  /** Last position reported while playing; Howler often resets seek to 0 on end. */
  getLastProgressMs(): number;
  /** HTML5 media element position; reliable when Howler seek/progress stall in background tabs. */
  getMediaPositionMs(): number;
  getDurationMs(): number;
  /** Whether the underlying HTML5 element has reached its natural end. */
  isMediaEnded(): boolean;
  /** If playback finished while the tab was backgrounded, emit onEnded once. */
  syncEndedIfComplete(): void;
  isPlaying(): boolean;
  setVolume(v: number): void;
  fadeVolume(from: number, to: number, ms: number): void;
  state(): "unloaded" | "loading" | "loaded";
  destroy(): void;
}

type HowlWithSounds = Howl & {
  _sounds?: Array<{ _node?: HTMLAudioElement }>;
};

function html5AudioNode(howl: Howl | null): HTMLAudioElement | null {
  if (!howl) return null;
  return (howl as HowlWithSounds)._sounds?.[0]?._node ?? null;
}

export function createHowlerAudioEngine(): AudioEngine {
  let howl: Howl | null = null;
  let blobUrl: string | null = null;
  let events: AudioEngineEvents | null = null;
  let volume = 1;
  let lastProgressMs = 0;
  let stallWatchId: ReturnType<typeof setInterval> | null = null;
  let stalled = false;
  let endNotified = false;
  let mediaNode: HTMLAudioElement | null = null;

  const clearStallWatch = () => {
    if (stallWatchId !== null) {
      clearInterval(stallWatchId);
      stallWatchId = null;
    }
    stalled = false;
  };

  const detachMediaListeners = () => {
    if (!mediaNode) return;
    mediaNode.removeEventListener("ended", onMediaEnded);
    mediaNode.removeEventListener("timeupdate", onMediaTimeUpdate);
    mediaNode = null;
  };

  const notifyEnded = () => {
    if (endNotified) return;
    endNotified = true;
    clearStallWatch();
    events?.onEnded();
  };

  const onMediaEnded = () => {
    const node = html5AudioNode(howl);
    if (node && Number.isFinite(node.currentTime)) {
      lastProgressMs = Math.max(lastProgressMs, Math.round(node.currentTime * 1000));
    }
    notifyEnded();
  };

  const onMediaTimeUpdate = () => {
    const node = html5AudioNode(howl);
    if (!node || !howl?.playing()) return;
    const pos = Math.round(node.currentTime * 1000);
    if (!Number.isFinite(pos) || pos <= lastProgressMs) return;
    lastProgressMs = pos;
    if (stalled) {
      stalled = false;
      events?.onResume();
    }
    events?.onProgress(pos);
  };

  const attachMediaListeners = () => {
    const node = html5AudioNode(howl);
    if (!node || node === mediaNode) return;
    detachMediaListeners();
    mediaNode = node;
    node.addEventListener("ended", onMediaEnded);
    node.addEventListener("timeupdate", onMediaTimeUpdate);
  };

  const startStallWatch = () => {
    clearStallWatch();
    attachMediaListeners();
    stallWatchId = setInterval(() => {
      if (!howl?.playing()) return;
      const node = html5AudioNode(howl);
      const pos = node
        ? Math.round(node.currentTime * 1000)
        : Math.round((howl.seek() as number) * 1000);
      if (!Number.isFinite(pos)) return;
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
      endNotified = false;
      if (src.startsWith("blob:")) blobUrl = src;

      howl = new Howl({
        src: [src],
        format: formatHints,
        html5: true,
        volume,
        onload: () => {
          const d = howl?.duration() ?? 0;
          attachMediaListeners();
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
          onMediaEnded();
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

    getLastProgressMs() {
      return lastProgressMs;
    },

    getMediaPositionMs() {
      const node = html5AudioNode(howl);
      if (!node || !Number.isFinite(node.currentTime)) return 0;
      return Math.round(node.currentTime * 1000);
    },

    isMediaEnded() {
      const node = html5AudioNode(howl);
      return node?.ended === true;
    },

    syncEndedIfComplete() {
      if (!howl || howl.state() !== "loaded") return;
      const node = html5AudioNode(howl);
      if (node?.ended === true) {
        onMediaEnded();
        return;
      }
      if (!howl.playing()) return;
      const durationMs = this.getDurationMs();
      if (durationMs <= 0) return;
      const positionMs = Math.max(this.getPositionMs(), this.getMediaPositionMs(), lastProgressMs);
      if (positionMs >= durationMs - 250) {
        onMediaEnded();
      }
    },

    isPlaying() {
      return howl?.playing() ?? false;
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
      detachMediaListeners();
      endNotified = false;
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
