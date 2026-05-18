import { useCallback, useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import type { Track } from "@dexaudio/shared-types";
import { getItem, StorageKeys } from "@/lib/local-storage.js";
import { readFromCache } from "@/lib/cache-service.js";
import { startListening, updateListenPosition, checkAndScrobble } from "@/lib/scrobble-tracker.js";

export function usePlayer() {
  const howlRef = useRef<Howl | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [fromCache, setFromCache] = useState(false);
  const currentTrackRef = useRef<Track | null>(null);

  const crossfade = getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 });

  const unload = useCallback(() => {
    howlRef.current?.unload();
    howlRef.current = null;
    setPlaying(false);
    setPosition(0);
  }, []);

  const loadTrack = useCallback(
    async (track: Track, onEnd?: () => void) => {
      unload();
      currentTrackRef.current = track;
      startListening(track);

      let src = `/api/v1/stream/${track.id}`;
      const cached = await readFromCache(track.id);
      if (cached) {
        src = URL.createObjectURL(cached);
        setFromCache(true);
      } else {
        setFromCache(false);
      }

      const howl = new Howl({
        src: [src],
        html5: true,
        volume,
        onplay: () => setPlaying(true),
        onpause: () => setPlaying(false),
        onend: () => {
          void checkAndScrobble();
          onEnd?.();
        },
        onload: () => setDuration(howl.duration() * 1000),
      });

      howlRef.current = howl;
    },
    [unload, volume],
  );

  const play = useCallback(() => {
    howlRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    howlRef.current?.pause();
  }, []);

  const seek = useCallback((ms: number) => {
    howlRef.current?.seek(ms / 1000);
    setPosition(ms);
    updateListenPosition(ms);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    howlRef.current?.volume(v);
  }, []);

  const fadeOut = useCallback(
    (cb: () => void) => {
      const howl = howlRef.current;
      if (!howl || !crossfade.enabled) {
        cb();
        return;
      }
      const from = howl.volume();
      const steps = 20;
      const stepMs = (crossfade.durationSec * 1000) / steps;
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
        const ms = howl.seek() * 1000;
        setPosition(ms);
        updateListenPosition(ms);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  return {
    playing,
    position,
    duration,
    volume,
    fromCache,
    loadTrack,
    play,
    pause,
    seek,
    setVolume,
    fadeOut,
    unload,
  };
}
