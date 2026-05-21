import { useCallback, useEffect, useRef, useState } from "react";

import { Howl, Howler } from "howler";

import type { PlaybackFailure, Track } from "@dexaudio/shared-types";

import { getItem, isGaplessPlaybackEnabled, setItem, StorageKeys } from "@/lib/local-storage.js";

import {
  persistPlaybackSessionNow,
  usePlaybackQueue,
} from "@/stores/playback-queue-store.js";

import { readFromCache } from "@/lib/cache-service.js";

import { startListening, updateListenPosition, checkAndScrobble } from "@/lib/scrobble-tracker.js";

import { ApiError } from "@/services/api-client.js";

import {

  classifyPlaybackError,

  isAutoplayBlockedError,

  isIgnorableHowlerError,

} from "@/lib/playback-errors.js";

import {

  blobUrlForTrack,

  fetchTrackAudioBlob,

  howlerFormatsForTrack,

} from "@/lib/stream-audio.js";



type StagedPlayback = {

  track: Track;

  howl: Howl;

  blobUrl: string;

};

export type LoadTrackOptions = {
  autoplayOnLoad?: boolean;
  initialSeekMs?: number;
};



function disposeStaged(slot: StagedPlayback | null) {

  if (!slot) return;

  slot.howl.unload();

  if (slot.blobUrl.startsWith("blob:")) {

    URL.revokeObjectURL(slot.blobUrl);

  }

}



export function usePlayerState() {

  const howlRef = useRef<Howl | null>(null);

  const blobUrlRef = useRef<string | null>(null);

  const loadIdRef = useRef(0);

  const stagedGenRef = useRef(0);

  const stagedForwardRef = useRef<StagedPlayback | null>(null);

  const stagedBackwardRef = useRef<StagedPlayback | null>(null);

  const positionAtErrorRef = useRef(0);

  const retryOnceRef = useRef(false);

  const loadTrackRef = useRef<
    (track: Track, onEnd?: () => void, options?: LoadTrackOptions) => Promise<void>
  >(async () => undefined);

  const positionPersistRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onEndRef = useRef<(() => void) | undefined>(undefined);



  const [playing, setPlaying] = useState(false);

  const [position, setPosition] = useState(0);

  const [duration, setDuration] = useState(0);

  const [volume, setVolumeState] = useState(() => getItem(StorageKeys.volume, 1));

  const [fromCache, setFromCache] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<PlaybackFailure | null>(null);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const currentTrackRef = useRef<Track | null>(null);

  const syncRestoredPosition = useCallback(() => {
    const { restorePhase, restoredElapsedMs, playbackStarted } = usePlaybackQueue.getState();
    if (restorePhase && playbackStarted && !howlRef.current) {
      setPosition(restoredElapsedMs);
    }
  }, []);

  useEffect(() => {
    syncRestoredPosition();
    return usePlaybackQueue.subscribe((state, prev) => {
      if (state.restorePhase !== prev.restorePhase || state.restoredElapsedMs !== prev.restoredElapsedMs) {
        syncRestoredPosition();
      }
    });
  }, [syncRestoredPosition]);

  const crossfade = getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 });



  const clearError = useCallback(() => {

    setError(null);

    setAutoplayBlocked(false);

  }, []);



  const revokeBlobUrl = useCallback(() => {

    if (blobUrlRef.current) {

      URL.revokeObjectURL(blobUrlRef.current);

      blobUrlRef.current = null;

    }

  }, []);



  const cancelStagedPreloads = useCallback(() => {

    stagedGenRef.current += 1;

    disposeStaged(stagedForwardRef.current);

    disposeStaged(stagedBackwardRef.current);

    stagedForwardRef.current = null;

    stagedBackwardRef.current = null;

  }, []);



  const unload = useCallback(() => {

    howlRef.current?.unload();

    howlRef.current = null;

    revokeBlobUrl();

    setPlaying(false);

    setPosition(0);

    setDuration(0);

  }, [revokeBlobUrl]);



  const resolveTrackSrc = useCallback(

    async (

      track: Track,

      loadId: number,

    ): Promise<{ src: string; fromCache: boolean; useLiveOnCacheError: boolean } | null> => {

      try {

        const cached = await readFromCache(track.id);

        if (loadIdRef.current !== loadId) return null;



        if (cached && cached.size > 2048) {

          const url = blobUrlForTrack(track, cached);

          return { src: url, fromCache: true, useLiveOnCacheError: true };

        }



        const blob = await fetchTrackAudioBlob(track.id);

        if (loadIdRef.current !== loadId) return null;

        const url = blobUrlForTrack(track, blob);

        return { src: url, fromCache: false, useLiveOnCacheError: false };

      } catch {

        return null;

      }

    },

    [],

  );

  const resolveStagedTrackSrc = useCallback(
    async (
      track: Track,
      stagedGen: number,
    ): Promise<{ src: string; fromCache: boolean; useLiveOnCacheError: boolean } | null> => {
      try {
        const cached = await readFromCache(track.id);
        if (stagedGenRef.current !== stagedGen) return null;

        if (cached && cached.size > 2048) {
          const url = blobUrlForTrack(track, cached);
          return { src: url, fromCache: true, useLiveOnCacheError: true };
        }

        const blob = await fetchTrackAudioBlob(track.id);
        if (stagedGenRef.current !== stagedGen) return null;
        const url = blobUrlForTrack(track, blob);
        return { src: url, fromCache: false, useLiveOnCacheError: false };
      } catch {
        return null;
      }
    },
    [],
  );

  const createHowl = useCallback(

    (

      track: Track,

      src: string,

      loadId: number,

      useLiveOnCacheError: boolean,

      onEnd: (() => void) | undefined,

      autoplayOnLoad: boolean,

      suppressErrors = false,

    ) => {

      const howl = new Howl({

        src: [src],

        format: howlerFormatsForTrack(track.format),

        html5: true,

        volume,

        onplay: () => {

          if (loadIdRef.current !== loadId) return;

          setPlaying(true);

          clearError();

          const d = howl.duration();

          if (d && Number.isFinite(d)) {

            setDuration(Math.round(d * 1000));

          }

        },

        onpause: () => {

          if (loadIdRef.current !== loadId) return;

          setPlaying(false);

        },

        onstop: () => {

          if (loadIdRef.current !== loadId) return;

          setPlaying(false);

        },

        onend: () => {

          if (loadIdRef.current !== loadId) return;

          setPlaying(false);

          void checkAndScrobble();

          onEnd?.();

        },

        onload: () => {

          if (loadIdRef.current !== loadId) return;

          setLoading(false);

          const d = howl.duration();

          if (d && Number.isFinite(d)) {

            setDuration(Math.round(d * 1000));

          }

          if (!autoplayOnLoad) return;

          const playResult = howl.play() as unknown;

          if (playResult && typeof (playResult as Promise<void>).catch === "function") {

            void (playResult as Promise<void>).catch(() => {

              if (Howler.ctx?.state === "suspended") {

                setAutoplayBlocked(true);

              }

            });

          }

        },

        onloaderror: (_id, err: unknown) => {

          if (loadIdRef.current !== loadId) return;

          if (isIgnorableHowlerError(err)) return;

          if (suppressErrors) return;

          setLoading(false);

          positionAtErrorRef.current = (howl.seek() as number) * 1000;

          const howlerErr = typeof err === "number" || typeof err === "string" ? err : 4;



          if (useLiveOnCacheError && src.startsWith("blob:")) {

            howl.unload();

            if (src.startsWith("blob:")) URL.revokeObjectURL(src);

            void loadTrackRef.current(track, onEnd);

            return;

          }



          if (positionAtErrorRef.current > 0 && !retryOnceRef.current) {

            retryOnceRef.current = true;

            void loadTrackRef.current(track, onEnd);

            return;

          }



          setError(classifyPlaybackError("howler", howlerErr, track));

        },

        onplayerror: (_id, err: unknown) => {

          if (loadIdRef.current !== loadId) return;

          if (isIgnorableHowlerError(err)) return;

          if (suppressErrors) return;

          const howlerErr = typeof err === "number" || typeof err === "string" ? err : 4;

          if (Howler.ctx?.state === "suspended" || isAutoplayBlockedError(howlerErr)) {

            setAutoplayBlocked(true);

            setLoading(false);

            return;

          }

          setError(classifyPlaybackError("howler", howlerErr, track));

          setLoading(false);

        },

      });



      return howl;

    },

    [volume, clearError],

  );



  const promoteStaged = useCallback(

    (staged: StagedPlayback, onEnd?: () => void): boolean => {

      const state = staged.howl.state();

      if (state !== "loaded") return false;



      const outgoing = howlRef.current;
      const outgoingBlob = blobUrlRef.current;

      if (outgoing) {
        outgoing.unload();
        if (outgoingBlob?.startsWith("blob:")) {
          URL.revokeObjectURL(outgoingBlob);
        }
      }

      howlRef.current = staged.howl;

      blobUrlRef.current = staged.blobUrl.startsWith("blob:") ? staged.blobUrl : null;

      currentTrackRef.current = staged.track;

      startListening(staged.track);

      clearError();

      setFromCache(false);

      setLoading(false);



      staged.howl.volume(volume);

      const d = staged.howl.duration();

      if (d && Number.isFinite(d)) {

        setDuration(Math.round(d * 1000));

      }

      staged.howl.play();

      setPlaying(true);

      setPosition(0);



      if (import.meta.env.DEV) {

        console.debug("[gapless] handoff", staged.track.id);

      }



      return true;

    },

    [volume, clearError],

  );



  const preloadStaged = useCallback(

    async (track: Track, direction: "forward" | "backward", onEnd?: () => void) => {

      if (!isGaplessPlaybackEnabled()) return;



      const gen = ++stagedGenRef.current;

      if (direction === "forward") {

        disposeStaged(stagedForwardRef.current);

        stagedForwardRef.current = null;

      } else {

        disposeStaged(stagedBackwardRef.current);

        stagedBackwardRef.current = null;

      }



      const resolved = await resolveStagedTrackSrc(track, gen);

      if (stagedGenRef.current !== gen || !resolved) return;

      const stagedLoadId = loadIdRef.current;
      const howl = createHowl(
        track,
        resolved.src,
        stagedLoadId,
        resolved.useLiveOnCacheError,
        onEnd,
        false,
        true,
      );

      const staged: StagedPlayback = { track, howl, blobUrl: resolved.src };



      if (direction === "forward") {

        stagedForwardRef.current = staged;

      } else {

        stagedBackwardRef.current = staged;

      }

    },

    [createHowl, resolveStagedTrackSrc],

  );



  const preloadForward = useCallback(

    (track: Track, onEnd?: () => void) => {

      void preloadStaged(track, "forward", onEnd);

    },

    [preloadStaged],

  );



  const preloadBackward = useCallback(

    (track: Track, onEnd?: () => void) => {

      void preloadStaged(track, "backward", onEnd);

    },

    [preloadStaged],

  );



  const tryHandoffForward = useCallback(() => {

    if (!isGaplessPlaybackEnabled()) return false;

    const staged = stagedForwardRef.current;

    if (!staged) {

      if (import.meta.env.DEV) console.debug("[gapless] forward miss: no staged track");

      return false;

    }

    if (!promoteStaged(staged, onEndRef.current)) {

      if (import.meta.env.DEV) console.debug("[gapless] forward miss: not loaded");

      return false;

    }

    stagedForwardRef.current = null;

    return true;

  }, [promoteStaged]);



  const tryHandoffBackward = useCallback(() => {

    if (!isGaplessPlaybackEnabled()) return false;

    const staged = stagedBackwardRef.current;

    if (!staged) return false;

    if (!promoteStaged(staged, onEndRef.current)) return false;

    stagedBackwardRef.current = null;

    return true;

  }, [promoteStaged]);



  const getActiveTrackId = useCallback(() => currentTrackRef.current?.id ?? null, []);



  const loadTrack = useCallback(

    async (track: Track, onEnd?: () => void, options: LoadTrackOptions = {}) => {

      const autoplayOnLoad = options.autoplayOnLoad ?? true;

      const loadId = ++loadIdRef.current;

      retryOnceRef.current = false;

      onEndRef.current = onEnd;



      cancelStagedPreloads();

      unload();

      clearError();

      currentTrackRef.current = track;

      startListening(track);

      setLoading(true);



      const resolved = await resolveTrackSrc(track, loadId);

      if (loadIdRef.current !== loadId || !resolved) {

        if (loadIdRef.current === loadId && !resolved) {

          setError(classifyPlaybackError("howler", 2, track));

          setLoading(false);

        }

        return;

      }



      revokeBlobUrl();

      blobUrlRef.current = resolved.src.startsWith("blob:") ? resolved.src : null;

      setFromCache(resolved.fromCache);



      if (loadIdRef.current !== loadId) return;

      const howl = createHowl(

        track,

        resolved.src,

        loadId,

        resolved.useLiveOnCacheError,

        onEnd,

        autoplayOnLoad,

        false,

      );

      howlRef.current = howl;

      if (options.initialSeekMs !== undefined && options.initialSeekMs > 0) {
        howl.once("load", () => {
          if (loadIdRef.current !== loadId) return;
          const seekSec = options.initialSeekMs! / 1000;
          howl.seek(seekSec);
          setPosition(options.initialSeekMs!);
          updateListenPosition(options.initialSeekMs!);
        });
      }

    },

    [unload, clearError, createHowl, revokeBlobUrl, resolveTrackSrc, cancelStagedPreloads],

  );



  loadTrackRef.current = loadTrack;



  const resumeAutoplay = useCallback(() => {

    void Howler.ctx?.resume();

    setAutoplayBlocked(false);

    howlRef.current?.play();

  }, []);



  const play = useCallback(() => {

    clearError();

    usePlaybackQueue.getState().markPlaybackStarted();

    howlRef.current?.play();

  }, [clearError]);



  const pause = useCallback(() => {

    howlRef.current?.pause();

    if (howlRef.current) {
      const ms = Math.round((howlRef.current.seek() as number) * 1000);
      persistPlaybackSessionNow(ms);
    }

  }, []);



  const seek = useCallback((ms: number) => {

    const rounded = Math.round(ms);

    howlRef.current?.seek(rounded / 1000);

    setPosition(rounded);

    updateListenPosition(rounded);

  }, []);



  const setVolume = useCallback((v: number) => {

    setVolumeState(v);

    setItem(StorageKeys.volume, v);

    howlRef.current?.volume(v);

    stagedForwardRef.current?.howl.volume(v);

    stagedBackwardRef.current?.howl.volume(v);

  }, []);



  const fadeOut = useCallback(

    (cb: () => void) => {

      const howl = howlRef.current;

      if (!howl || !crossfade.enabled || isGaplessPlaybackEnabled()) {

        cb();

        return;

      }

      const remainingSec = Math.max(0, howl.duration() - (howl.seek() as number));

      const effectiveSec = Math.min(crossfade.durationSec, remainingSec);

      const from = howl.volume();

      const steps = 20;

      const stepMs = (effectiveSec * 1000) / steps;

      let i = 0;

      const interval = setInterval(() => {

        i += 1;

        howl.volume(from * (1 - i / steps));

        if (i >= steps) {

          clearInterval(interval);

          cb();

        }

      }, stepMs);

    },

    [crossfade],

  );



  useEffect(() => {

    const id = setInterval(() => {

      const howl = howlRef.current;

      if (howl?.playing()) {

        const ms = Math.round((howl.seek() as number) * 1000);

        setPosition(ms);

        updateListenPosition(ms);

      }

    }, 250);

    return () => clearInterval(id);

  }, []);

  useEffect(() => {

    positionPersistRef.current = setInterval(() => {

      const howl = howlRef.current;

      if (!howl?.playing() || !usePlaybackQueue.getState().playbackStarted) return;

      const ms = Math.round((howl.seek() as number) * 1000);

      persistPlaybackSessionNow(ms);

    }, 5000);

    return () => {

      if (positionPersistRef.current) clearInterval(positionPersistRef.current);

    };

  }, []);



  return {

    playing,

    position,

    duration,

    volume,

    fromCache,

    loading,

    error,

    autoplayBlocked,

    loadTrack,

    play,

    pause,

    seek,

    setVolume,

    fadeOut,

    unload,

    clearError,

    resumeAutoplay,

    preloadForward,

    preloadBackward,

    tryHandoffForward,

    tryHandoffBackward,

    getActiveTrackId,

    cancelStagedPreloads,

  };

}


