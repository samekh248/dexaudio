import { useCallback, useEffect, useRef, useState } from "react";
import { Howl, Howler } from "howler";
import type { PlaybackFailure, Track } from "@dexaudio/shared-types";
import { getItem, setItem, StorageKeys } from "@/lib/local-storage.js";
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

export function usePlayerState() {
  const howlRef = useRef<Howl | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const loadIdRef = useRef(0);
  const positionAtErrorRef = useRef(0);
  const retryOnceRef = useRef(false);
  const loadTrackRef = useRef<(track: Track, onEnd?: () => void) => Promise<void>>(
    async () => undefined,
  );

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => getItem(StorageKeys.volume, 1));
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PlaybackFailure | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const currentTrackRef = useRef<Track | null>(null);

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

  const unload = useCallback(() => {
    howlRef.current?.unload();
    howlRef.current = null;
    revokeBlobUrl();
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [revokeBlobUrl]);

  const createHowl = useCallback(
    (
      track: Track,
      src: string,
      loadId: number,
      useLiveOnCacheError: boolean,
      onEnd?: () => void,
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
          setLoading(false);
          positionAtErrorRef.current = (howl.seek() as number) * 1000;
          const howlerErr = typeof err === "number" || typeof err === "string" ? err : 4;

          if (useLiveOnCacheError && src.startsWith("blob:")) {
            howl.unload();
            revokeBlobUrl();
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

      howlRef.current = howl;
    },
    [volume, clearError, revokeBlobUrl],
  );

  const loadTrack = useCallback(
    async (track: Track, onEnd?: () => void) => {
      const loadId = ++loadIdRef.current;
      retryOnceRef.current = false;

      unload();
      clearError();
      currentTrackRef.current = track;
      startListening(track);
      setLoading(true);

      let src = "";
      let useLiveOnCacheError = false;

      try {
        const cached = await readFromCache(track.id);
        if (loadIdRef.current !== loadId) return;

        if (cached && cached.size > 2048) {
          revokeBlobUrl();
          blobUrlRef.current = blobUrlForTrack(track, cached);
          src = blobUrlRef.current;
          setFromCache(true);
          useLiveOnCacheError = true;
        } else {
          setFromCache(false);
          const blob = await fetchTrackAudioBlob(track.id);
          if (loadIdRef.current !== loadId) return;
          revokeBlobUrl();
          blobUrlRef.current = blobUrlForTrack(track, blob);
          src = blobUrlRef.current;
        }
      } catch (e) {
        if (loadIdRef.current !== loadId) return;
        if (e instanceof ApiError) {
          setError(classifyPlaybackError("api", e, track));
        } else {
          setError(classifyPlaybackError("howler", 2, track));
        }
        setLoading(false);
        return;
      }

      if (loadIdRef.current !== loadId) return;
      createHowl(track, src, loadId, useLiveOnCacheError, onEnd);
    },
    [unload, clearError, createHowl, revokeBlobUrl],
  );

  loadTrackRef.current = loadTrack;

  const resumeAutoplay = useCallback(() => {
    void Howler.ctx?.resume();
    setAutoplayBlocked(false);
    howlRef.current?.play();
  }, []);

  const play = useCallback(() => {
    clearError();
    howlRef.current?.play();
  }, [clearError]);

  const pause = useCallback(() => {
    howlRef.current?.pause();
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
  }, []);

  const fadeOut = useCallback(
    (cb: () => void) => {
      const howl = howlRef.current;
      if (!howl || !crossfade.enabled) {
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
  };
}
