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

/** Fire onEnded when within this window of the track duration (ms). */
const TRACK_END_TOLERANCE_MS = 150;

function html5AudioNode(howl: Howl | null): HTMLAudioElement | null {
  if (!howl) return null;
  return (howl as HowlWithSounds)._sounds?.[0]?._node ?? null;
}

function trackDurationMs(howl: Howl | null): number {
  if (!howl) return 0;
  const d = howl.duration();
  return Number.isFinite(d) ? Math.round(d * 1000) : 0;
}

function isNearTrackEnd(howl: Howl | null, positionMs: number): boolean {
  const durationMs = trackDurationMs(howl);
  return durationMs > 0 && positionMs >= durationMs - TRACK_END_TOLERANCE_MS;
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
  let mediaListenerAttempts = 0;
  let mediaListenerTimer: ReturnType<typeof setTimeout> | null = null;
  let wallEndAt = 0;
  let wallEndTimer: ReturnType<typeof setInterval> | null = null;
  /** Set while our code calls pause(); unset after the media element pauses. */
  let intentionalPause = false;
  /** Set while our code calls play(); allows one guarded media "play" event. */
  let intentionalPlay = false;
  /**
   * When another tab takes audio focus (e.g. YouTube), the browser pauses us and may
   * auto-resume when that media stops — block that until the user presses play again.
   */
  let blockUnintendedResume = false;

  const clearStallWatch = () => {
    if (stallWatchId !== null) {
      clearInterval(stallWatchId);
      stallWatchId = null;
    }
    stalled = false;
  };

  const clearMediaListenerRetry = () => {
    if (mediaListenerTimer !== null) {
      clearTimeout(mediaListenerTimer);
      mediaListenerTimer = null;
    }
    mediaListenerAttempts = 0;
  };

  const onMediaPauseGuard = () => {
    if (!intentionalPause) {
      blockUnintendedResume = true;
    }
  };

  const onMediaPlayGuard = () => {
    const node = html5AudioNode(howl);
    if (blockUnintendedResume && !intentionalPlay) {
      if (node) {
        intentionalPause = true;
        node.pause();
        intentionalPause = false;
      }
      return;
    }
  };

  const detachMediaListeners = () => {
    clearMediaListenerRetry();
    if (!mediaNode) return;
    mediaNode.removeEventListener("ended", onMediaEnded);
    mediaNode.removeEventListener("timeupdate", onMediaTimeUpdate);
    mediaNode.removeEventListener("pause", onMediaPauseGuard);
    mediaNode.removeEventListener("play", onMediaPlayGuard);
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

  const isNodeActivelyPlaying = (node: HTMLAudioElement): boolean => {
    return !node.paused && !node.ended;
  };

  const scheduleWallEnd = () => {
    const durationMs = trackDurationMs(howl);
    const node = html5AudioNode(howl);
    const posMs = node
      ? Math.round(node.currentTime * 1000)
      : Math.max(lastProgressMs, Math.round((howl?.seek() as number) * 1000) || 0);
    if (durationMs > posMs) {
      wallEndAt = performance.now() + (durationMs - posMs);
    }
  };

  const clearWallEndWatch = () => {
    if (wallEndTimer !== null) {
      clearInterval(wallEndTimer);
      wallEndTimer = null;
    }
    wallEndAt = 0;
  };

  const checkWallEnd = () => {
    if (endNotified) return;
    const node = html5AudioNode(howl);
    if (node?.ended) {
      onMediaEnded();
      return;
    }
    if (node && isNodeActivelyPlaying(node) && Number.isFinite(node.duration) && node.duration > 0) {
      const posMs = Math.round(node.currentTime * 1000);
      if (isNearTrackEnd(howl, posMs)) {
        lastProgressMs = Math.max(lastProgressMs, posMs);
        notifyEnded();
        return;
      }
    }
    if (wallEndAt > 0 && performance.now() >= wallEndAt - TRACK_END_TOLERANCE_MS) {
      notifyEnded();
    }
  };

  const startWallEndWatch = () => {
    clearWallEndWatch();
    scheduleWallEnd();
    wallEndTimer = setInterval(checkWallEnd, 1000);
  };

  const onMediaTimeUpdate = () => {
    const node = html5AudioNode(howl);
    if (!node || !isNodeActivelyPlaying(node)) return;
    const pos = Math.round(node.currentTime * 1000);
    if (!Number.isFinite(pos)) return;

    scheduleWallEnd();

    if (isNearTrackEnd(howl, pos)) {
      lastProgressMs = Math.max(lastProgressMs, pos);
      notifyEnded();
      return;
    }

    if (pos <= lastProgressMs) return;
    lastProgressMs = pos;
    if (stalled) {
      stalled = false;
      events?.onResume();
    }
    events?.onProgress(pos);
  };

  const attachMediaListeners = () => {
    const node = html5AudioNode(howl);
    if (!node) return;
    if (node === mediaNode) return;
    if (mediaNode) {
      mediaNode.removeEventListener("ended", onMediaEnded);
      mediaNode.removeEventListener("timeupdate", onMediaTimeUpdate);
      mediaNode.removeEventListener("pause", onMediaPauseGuard);
      mediaNode.removeEventListener("play", onMediaPlayGuard);
    }
    mediaNode = node;
    node.addEventListener("ended", onMediaEnded);
    node.addEventListener("timeupdate", onMediaTimeUpdate);
    node.addEventListener("pause", onMediaPauseGuard);
    node.addEventListener("play", onMediaPlayGuard);
  };

  const ensureMediaListeners = () => {
    attachMediaListeners();
    if (mediaNode || !howl) return;
    if (mediaListenerAttempts >= 40) return;
    mediaListenerAttempts += 1;
    mediaListenerTimer = setTimeout(ensureMediaListeners, 50);
  };

  const startStallWatch = () => {
    clearStallWatch();
    ensureMediaListeners();
    startWallEndWatch();
    stallWatchId = setInterval(() => {
      const node = html5AudioNode(howl);
      if (node && !isNodeActivelyPlaying(node) && !endNotified) return;
      if (!node && !howl?.playing()) return;
      const pos = node
        ? Math.round(node.currentTime * 1000)
        : Math.round((howl.seek() as number) * 1000);
      if (!Number.isFinite(pos)) return;
      if (isNearTrackEnd(howl, pos)) {
        lastProgressMs = Math.max(lastProgressMs, pos);
        notifyEnded();
        return;
      }
      if (pos > lastProgressMs) {
        lastProgressMs = pos;
        if (stalled) {
          stalled = false;
          events?.onResume();
        }
        events?.onProgress(pos);
      } else if (!stalled && howl?.playing()) {
        // Howler can report playing before the first timeupdate; avoid a false stall.
        if (lastProgressMs === 0 && pos === 0) return;
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
      blockUnintendedResume = false;
      intentionalPlay = false;
      intentionalPause = false;
      if (src.startsWith("blob:")) blobUrl = src;

      howl = new Howl({
        src: [src],
        format: formatHints,
        html5: true,
        volume,
        onload: () => {
          const d = howl?.duration() ?? 0;
          ensureMediaListeners();
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
      blockUnintendedResume = false;
      intentionalPlay = true;
      ensureMediaListeners();
      const result = howl?.play() as unknown;
      if (result && typeof (result as Promise<void>).catch === "function") {
        void (result as Promise<void>).catch((err: unknown) => {
          if (Howler.ctx?.state === "suspended" || isAutoplayPlayError(err)) {
            events?.onError("autoplay blocked");
          }
        });
      }
      intentionalPlay = false;
    },

    pause() {
      intentionalPause = true;
      howl?.pause();
      intentionalPause = false;
      blockUnintendedResume = true;
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
      if (!howl || howl.state() !== "loaded" || endNotified) return;
      const node = html5AudioNode(howl);
      if (node?.ended === true) {
        onMediaEnded();
        return;
      }
      const durationMs = this.getDurationMs();
      if (durationMs <= 0) return;
      const positionMs = Math.max(this.getPositionMs(), this.getMediaPositionMs(), lastProgressMs);
      if (isNearTrackEnd(howl, positionMs) && howl.playing()) {
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
      clearWallEndWatch();
      clearMediaListenerRetry();
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

function isAutoplayPlayError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name.toLowerCase();
  const msg = err.message.toLowerCase();
  return (
    name === "notallowederror" ||
    msg.includes("play()") ||
    msg.includes("user didn't interact") ||
    msg.includes("autoplay")
  );
}
