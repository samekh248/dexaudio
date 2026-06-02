import { useCallback, useEffect, useRef, useState } from "react";

import { Howler } from "howler";

import type { AudioQuality, PlaybackFailure, Track } from "@dexaudio/shared-types";

import { getItem, setItem, StorageKeys } from "@/lib/local-storage.js";

import {
  persistPlaybackSessionNow,
  usePlaybackQueue,
} from "@/stores/playback-queue-store.js";

import { readFromCache } from "@/lib/cache-service.js";

import { startListening, updateListenPosition, checkAndScrobble } from "@/lib/scrobble-tracker.js";
import {
  onPlaybackPause,
  onPlaybackPlay,
  onPlaybackProgress,
  onPlaybackStop,
  onTrackWillChange,
} from "@/lib/plex-playback-reporter.js";
import { notifyAudibleAlbumChange } from "@/lib/recently-played-refresh-coordinator.js";

import { ApiError } from "@/services/api-client.js";

import {
  classifyPlaybackError,
  classifyStallError,
  isAutoplayBlockedError,
  isIgnorableHowlerError,
} from "@/lib/playback-errors.js";

import {
  blobUrlForTrack,
  howlerFormatsForTrack,
  qualityFromCachedBlob,
  shouldAttemptLossless,
  streamUrlForTrack,
} from "@/lib/stream-audio.js";

import {
  createHowlerAudioEngine,
  type AudioEngine,
  type AudioEngineEvents,
} from "@/lib/audio-engine.js";
import {
  initialPlaybackMachineState,
  isLoadingIndicatorStatus,
  isTerminalStatus,
  reducePlaybackMachine,
  type PlaybackMachineState,
  type PlaybackStatus,
} from "@/lib/playback-machine.js";
import {
  backoffForAttempt,
  retriesRemaining,
  stallWindowExceeded,
} from "@/lib/recovery-policy.js";
import { getTransitionStyle, usePlaybackPrefs } from "@/lib/playback-prefs-store.js";
import {
  advancePlaybackQueue,
  onPlaybackProgressOrchestration,
} from "@/lib/playback-orchestrator.js";

type StagedPlayback = {
  track: Track;
  engine: AudioEngine;
  src: string;
  fromCache: boolean;
  useLiveOnCacheError: boolean;
  attemptLossless: boolean;
  playbackQuality: AudioQuality;
};

export type LoadTrackOptions = {
  autoplayOnLoad?: boolean;
  initialSeekMs?: number;
  skipCache?: boolean;
  /** Force transcoded delivery (lossless downgrade path). */
  forceTranscoded?: boolean;
};

type ResolvedTrackSrc = {
  src: string;
  fromCache: boolean;
  useLiveOnCacheError: boolean;
  attemptLossless: boolean;
  playbackQuality: AudioQuality;
};

const PREMATURE_END_MIN_DURATION_MS = 15_000;
const PREMATURE_END_END_TOLERANCE_MS = 3_000;
const RECENTLY_PLAYED_TRACE_PREFIX = "[recently-played-refresh]";

export function isPrematureEndedPlayback(positionMs: number, knownDurationMs: number): boolean {
  return (
    knownDurationMs >= PREMATURE_END_MIN_DURATION_MS &&
    positionMs < knownDurationMs - PREMATURE_END_END_TOLERANCE_MS
  );
}

/** Howler resets seek to 0 on end; use the last reported progress for end checks. */
export function resolveEndedPositionMs(positionMs: number, lastProgressMs: number): number {
  return Math.max(positionMs, lastProgressMs);
}

function disposeStaged(slot: StagedPlayback | null) {
  if (!slot) return;
  slot.engine.destroy();
}

export function usePlayerState() {
  const engineRef = useRef<AudioEngine>(createHowlerAudioEngine());
  const loadIdRef = useRef(0);
  const stagedGenRef = useRef(0);
  const stagedForwardRef = useRef<StagedPlayback | null>(null);
  const stagedBackwardRef = useRef<StagedPlayback | null>(null);
  const loadTrackRef = useRef<
    (track: Track, onEnd?: () => void, options?: LoadTrackOptions) => Promise<void>
  >(async () => undefined);
  const positionPersistRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEndRef = useRef<(() => void) | undefined>(undefined);
  const onTerminalRef = useRef<((reason: "ended" | "failed") => void) | undefined>(undefined);
  const machineRef = useRef<PlaybackMachineState>(initialPlaybackMachineState);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeekMsRef = useRef<number | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const useLiveFallbackRef = useRef(false);
  const losslessFallbackRef = useRef(false);
  const attemptedLosslessRef = useRef(false);
  const wallClockRef = useRef<number>(Date.now());

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => getItem(StorageKeys.volume, 1));
  const [fromCache, setFromCache] = useState(false);
  const [playbackQuality, setPlaybackQuality] = useState<AudioQuality | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [error, setError] = useState<PlaybackFailure | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const transitionStyle = usePlaybackPrefs((s) => s.transition);
  const crossfadeDurationSec = usePlaybackPrefs((s) => s.crossfadeDurationSec);

  const notifyRecentlyPlayedOnPlay = useCallback((track: Track) => {
    const albumId = track.albumId;
    if (!albumId) {
      if (import.meta.env.DEV) {
        console.debug(`${RECENTLY_PLAYED_TRACE_PREFIX} player_notify_skipped_missing_album`, {
          trackId: track.id,
          trackTitle: track.title,
        });
      }
      return;
    }
    if (import.meta.env.DEV) {
      console.debug(`${RECENTLY_PLAYED_TRACE_PREFIX} player_notify`, {
        albumId,
        trackId: track.id,
        trackTitle: track.title,
      });
    }
    notifyAudibleAlbumChange({ albumId, trackId: track.id });
  }, []);

  const loading = isLoadingIndicatorStatus(status);

  const applyMachine = useCallback((next: PlaybackMachineState) => {
    machineRef.current = next;
    setStatus(next.status);
    setPosition(next.positionMs);
    if (next.failure) setError(next.failure);
    setPlaying(next.status === "playing");
  }, []);

  const syncRestoredPosition = useCallback(() => {
    const { restorePhase, restoredElapsedMs, playbackStarted } = usePlaybackQueue.getState();
    if (restorePhase && playbackStarted && engineRef.current.state() === "unloaded") {
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

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setAutoplayBlocked(false);
  }, []);

  const cancelStagedPreloads = useCallback(() => {
    stagedGenRef.current += 1;
    disposeStaged(stagedForwardRef.current);
    disposeStaged(stagedBackwardRef.current);
    stagedForwardRef.current = null;
    stagedBackwardRef.current = null;
  }, []);

  const unload = useCallback(() => {
    const track = currentTrackRef.current;
    if (track && engineRef.current.state() === "loaded") {
      onPlaybackStop(track, engineRef.current.getPositionMs());
    }
    // Ensure no previously created Howler instance can keep emitting audio
    // when a fresh track is loaded (e.g. after remount/HMR edge cases).
    Howler.stop();
    clearRecoveryTimer();
    engineRef.current.destroy();
    engineRef.current = createHowlerAudioEngine();
    applyMachine(reducePlaybackMachine(machineRef.current, { type: "CANCEL" }));
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [applyMachine, clearRecoveryTimer]);

  const resolveTrackSrc = useCallback(
    async (
      track: Track,
      loadId: number,
      options: { skipCache?: boolean; forceTranscoded?: boolean } = {},
    ): Promise<ResolvedTrackSrc | null> => {
      const attemptLossless = shouldAttemptLossless(track, options.forceTranscoded);
      try {
        if (!options.skipCache) {
          const cached = await readFromCache(track.id);
          if (loadIdRef.current !== loadId) return null;
          if (cached && cached.size > 2048) {
            const cachedQuality = qualityFromCachedBlob(track, cached);
            const shouldBypassCachedTranscoded = attemptLossless && cachedQuality === "transcoded";
            if (!shouldBypassCachedTranscoded) {
              return {
                src: blobUrlForTrack(track, cached),
                fromCache: true,
                useLiveOnCacheError: true,
                attemptLossless,
                playbackQuality: cachedQuality,
              };
            }
          }
        }
        if (loadIdRef.current !== loadId) return null;
        return {
          src: streamUrlForTrack(track.id, { lossless: attemptLossless }),
          fromCache: false,
          useLiveOnCacheError: false,
          attemptLossless,
          playbackQuality: attemptLossless ? "lossless" : "transcoded",
        };
      } catch (err) {
        if (loadIdRef.current !== loadId) return null;
        throw err;
      }
    },
    [],
  );

  const resolveStagedTrackSrc = useCallback(
    async (
      track: Track,
      stagedGen: number,
    ): Promise<ResolvedTrackSrc | null> => {
      try {
        const cached = await readFromCache(track.id);
        if (stagedGenRef.current !== stagedGen) return null;
        if (cached && cached.size > 2048) {
          const cachedQuality = qualityFromCachedBlob(track, cached);
          return {
            src: blobUrlForTrack(track, cached),
            fromCache: true,
            useLiveOnCacheError: true,
            attemptLossless: cachedQuality === "lossless",
            playbackQuality: cachedQuality,
          };
        }
        if (stagedGenRef.current !== stagedGen) return null;
        // Staged preloading must not open a second live Plex stream while the
        // active uncached track is playing. Plex transcodes are sensitive to
        // overlapping requests and can prematurely end the current stream.
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  const scheduleRecovery = useCallback(
    (track: Track, loadId: number, onEnd?: () => void) => {
      clearRecoveryTimer();
      const attempt = machineRef.current.recovery.attempt;
      const delay = backoffForAttempt(attempt + 1);
      recoveryTimerRef.current = setTimeout(() => {
        if (loadIdRef.current !== loadId) return;
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "RETRY", nowMs: Date.now() }));
        void loadTrackRef.current(track, onEnd, {
          skipCache: useLiveFallbackRef.current,
          forceTranscoded: losslessFallbackRef.current,
        });
      }, delay);
    },
    [applyMachine, clearRecoveryTimer],
  );

  const downgradeToTranscoded = useCallback(
    (track: Track, onEnd: (() => void) | undefined, positionMs: number, loadId: number) => {
      if (loadIdRef.current !== loadId) return;
      losslessFallbackRef.current = true;
      attemptedLosslessRef.current = false;
      setPlaybackQuality("transcoded");
      clearRecoveryTimer();
      void loadTrackRef.current(track, onEnd, {
        skipCache: useLiveFallbackRef.current,
        forceTranscoded: true,
        initialSeekMs: positionMs,
        autoplayOnLoad: true,
      });
    },
    [clearRecoveryTimer],
  );

  const handleTerminalFailure = useCallback(
    (_track: Track, failure: PlaybackFailure, loadId: number) => {
      if (loadIdRef.current !== loadId) return;
      applyMachine(
        reducePlaybackMachine(machineRef.current, {
          type: "ERROR",
          recoverable: failure.recoverable,
          retriesLeft: false,
          failure,
        }),
      );
      onTerminalRef.current?.("failed");
      advancePlaybackQueue("failed");
    },
    [applyMachine],
  );

  const makeEngineEvents = useCallback(
    (
      track: Track,
      src: string,
      loadId: number,
      useLiveOnCacheError: boolean,
      attemptLossless: boolean,
      onEnd: (() => void) | undefined,
      autoplayOnLoad: boolean,
      engine: AudioEngine,
    ): AudioEngineEvents => ({
      onLoaded: (durationMs) => {
        if (loadIdRef.current !== loadId) return;
        setDuration(durationMs);
        applyMachine(
          reducePlaybackMachine(machineRef.current, { type: "LOADED", autoplay: autoplayOnLoad }),
        );
        if (autoplayOnLoad) engine.play();
      },
      onPlay: () => {
        if (loadIdRef.current !== loadId) return;
        clearError();
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "PLAY" }));
        onPlaybackPlay(track, engine.getPositionMs());
        notifyRecentlyPlayedOnPlay(track);
      },
      onPause: () => {
        if (loadIdRef.current !== loadId) return;
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "PAUSE" }));
        onPlaybackPause(track, engine.getPositionMs());
      },
      onEnded: () => {
        if (loadIdRef.current !== loadId) return;
        const mediaPositionMs = engine.getMediaPositionMs();
        const positionMs = resolveEndedPositionMs(
          Math.max(engine.getPositionMs(), mediaPositionMs),
          Math.max(engine.getLastProgressMs(), mediaPositionMs),
        );
        const knownDurationMs = Math.max(engine.getDurationMs(), track.durationMs ?? 0);
        const endedEarly =
          !engine.isMediaEnded() &&
          isPrematureEndedPlayback(positionMs, knownDurationMs);

        if (endedEarly) {
          const attempt = machineRef.current.recovery.attempt;
          if (retriesRemaining(attempt)) {
            scheduleRecovery(track, loadId, onEnd);
            return;
          }
        }

        onPlaybackStop(track, positionMs);
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "ENDED" }));
        void checkAndScrobble();
        onEnd?.();
        onTerminalRef.current?.("ended");
        advancePlaybackQueue("ended");
      },
      onError: (err) => {
        if (loadIdRef.current !== loadId) return;
        if (isIgnorableHowlerError(err)) return;
        if (Howler.ctx?.state === "suspended" || isAutoplayBlockedError(err)) {
          setAutoplayBlocked(true);
          applyMachine(reducePlaybackMachine(machineRef.current, { type: "PAUSE" }));
          return;
        }
        if (useLiveOnCacheError && src.startsWith("blob:") && !useLiveFallbackRef.current) {
          useLiveFallbackRef.current = true;
          if (attemptLossless) {
            losslessFallbackRef.current = true;
          }
          void loadTrackRef.current(track, onEnd, {
            skipCache: true,
            forceTranscoded: attemptLossless,
          });
          return;
        }
        if (attemptLossless && !losslessFallbackRef.current) {
          const positionMs = Math.max(engine.getPositionMs(), engine.getLastProgressMs());
          downgradeToTranscoded(track, onEnd, positionMs, loadId);
          return;
        }
        const failure = classifyPlaybackError("howler", err, track);
        const attempt = machineRef.current.recovery.attempt;
        if (failure.recoverable && retriesRemaining(attempt)) {
          scheduleRecovery(track, loadId, onEnd);
          return;
        }
        setError(failure);
        handleTerminalFailure(track, failure, loadId);
      },
      onStall: () => {
        if (loadIdRef.current !== loadId) return;
        if (machineRef.current.status !== "playing") return;
        applyMachine(
          reducePlaybackMachine(machineRef.current, { type: "STALL", nowMs: Date.now() }),
        );
      },
      onResume: () => {
        if (loadIdRef.current !== loadId) return;
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "RESUME" }));
      },
      onProgress: (ms) => {
        if (loadIdRef.current !== loadId) return;
        setPosition(ms);
        updateListenPosition(ms);
        onPlaybackProgress(track, ms);
        const knownDurationMs = Math.max(engine.getDurationMs(), track.durationMs ?? 0);
        onPlaybackProgressOrchestration(track.id, ms, knownDurationMs);
        if (
          machineRef.current.status === "buffering" &&
          stallWindowExceeded(machineRef.current.recovery.stallStartedAt, Date.now())
        ) {
          if (attemptLossless && !losslessFallbackRef.current) {
            downgradeToTranscoded(track, onEnd, ms, loadId);
            return;
          }
          const stallFailure = classifyStallError(track);
          const attempt = machineRef.current.recovery.attempt;
          if (retriesRemaining(attempt)) {
            scheduleRecovery(track, loadId, onEnd);
          } else {
            setError(stallFailure);
            handleTerminalFailure(track, stallFailure, loadId);
          }
        }
      },
    }),
    [clearError, applyMachine, scheduleRecovery, handleTerminalFailure, notifyRecentlyPlayedOnPlay, downgradeToTranscoded],
  );

  const bindEngine = useCallback(
    (
      track: Track,
      src: string,
      loadId: number,
      useLiveOnCacheError: boolean,
      attemptLossless: boolean,
      onEnd: (() => void) | undefined,
      autoplayOnLoad: boolean,
      engine: AudioEngine,
    ) => {
      attemptedLosslessRef.current = attemptLossless;
      engine.setVolume(volume);
      engine.load(
        src,
        howlerFormatsForTrack(track.format, { lossless: attemptLossless }),
        makeEngineEvents(
          track,
          src,
          loadId,
          useLiveOnCacheError,
          attemptLossless,
          onEnd,
          autoplayOnLoad,
          engine,
        ),
      );
    },
    [volume, makeEngineEvents],
  );

  const promoteStaged = useCallback(
    (staged: StagedPlayback, onEnd?: () => void, crossfade = false): boolean => {
      if (staged.engine.state() !== "loaded") return false;

      const outgoing = engineRef.current;
      engineRef.current = staged.engine;
      outgoing.destroy();
      clearRecoveryTimer();

      // New load generation so any stale events from the outgoing engine are
      // ignored and the promoted engine's handlers are authoritative.
      const loadId = ++loadIdRef.current;
      useLiveFallbackRef.current = false;
      losslessFallbackRef.current = false;
      onEndRef.current = onEnd;
      void onTrackWillChange(staged.track);
      currentTrackRef.current = staged.track;
      startListening(staged.track);
      clearError();
      setFromCache(staged.fromCache);
      setPlaybackQuality(staged.playbackQuality);
      setDuration(staged.engine.getDurationMs());

      // Replace the lightweight preload stubs with the full lifecycle handlers
      // (stall recovery, guarded terminal advance, progress) bound to this load.
      staged.engine.setEvents(
        makeEngineEvents(
          staged.track,
          staged.src,
          loadId,
          staged.useLiveOnCacheError,
          staged.attemptLossless,
          onEnd,
          false,
          staged.engine,
        ),
      );

      // Reset recovery/position so the promoted track starts a fresh lifecycle.
      applyMachine(reducePlaybackMachine(machineRef.current, { type: "LOAD" }));
      applyMachine(reducePlaybackMachine(machineRef.current, { type: "LOADED", autoplay: false }));

      if (crossfade && transitionStyle === "crossfade") {
        const fadeMs = crossfadeDurationSec * 1000;
        staged.engine.setVolume(0);
        staged.engine.fadeVolume(0, volume, fadeMs);
        staged.engine.play();
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "PLAY" }));
        setPosition(0);
      } else {
        staged.engine.setVolume(volume);
        staged.engine.play();
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "PLAY" }));
        setPosition(0);
      }

      return true;
    },
    [
      volume,
      clearError,
      applyMachine,
      transitionStyle,
      crossfadeDurationSec,
      makeEngineEvents,
      clearRecoveryTimer,
    ],
  );

  const preloadStaged = useCallback(
    async (track: Track, direction: "forward" | "backward", _onEnd?: () => void) => {
      const style = getTransitionStyle();
      if (style !== "gapless" && style !== "crossfade") return;

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

      const engine = createHowlerAudioEngine();
      // Lightweight stubs while buffering in the background; promoteStaged swaps
      // in the full lifecycle handlers once this engine becomes active. A failed
      // preload simply never reaches "loaded", so promoteStaged falls back to a
      // normal load.
      engine.load(resolved.src, howlerFormatsForTrack(track.format, { lossless: resolved.attemptLossless }), {
        onLoaded: () => {},
        onPlay: () => {},
        onPause: () => {},
        onEnded: () => {},
        onError: () => {},
        onStall: () => {},
        onResume: () => {},
        onProgress: () => {},
      });

      const staged: StagedPlayback = {
        track,
        engine,
        src: resolved.src,
        fromCache: resolved.fromCache,
        useLiveOnCacheError: resolved.useLiveOnCacheError,
        attemptLossless: resolved.attemptLossless,
        playbackQuality: resolved.playbackQuality,
      };
      if (direction === "forward") stagedForwardRef.current = staged;
      else stagedBackwardRef.current = staged;
    },
    [resolveStagedTrackSrc],
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

  const tryHandoffForward = useCallback(
    (expectedTrack?: Track) => {
      const style = getTransitionStyle();
      if (style !== "gapless" && style !== "crossfade") return false;
      const staged = stagedForwardRef.current;
      if (!staged) return false;
      if (expectedTrack && staged.track.id !== expectedTrack.id) return false;
      const crossfade = style === "crossfade";
      if (!promoteStaged(staged, onEndRef.current, crossfade)) return false;
      stagedForwardRef.current = null;
      return true;
    },
    [promoteStaged],
  );

  const tryHandoffBackward = useCallback(
    (expectedTrack?: Track) => {
      const style = getTransitionStyle();
      if (style !== "gapless" && style !== "crossfade") return false;
      const staged = stagedBackwardRef.current;
      if (!staged) return false;
      if (expectedTrack && staged.track.id !== expectedTrack.id) return false;
      if (!promoteStaged(staged, onEndRef.current, false)) return false;
      stagedBackwardRef.current = null;
      return true;
    },
    [promoteStaged],
  );

  const getActiveTrackId = useCallback(() => currentTrackRef.current?.id ?? null, []);

  const loadTrack = useCallback(
    async (track: Track, onEnd?: () => void, options: LoadTrackOptions = {}) => {
      const autoplayOnLoad = options.autoplayOnLoad ?? true;
      const loadId = ++loadIdRef.current;
      useLiveFallbackRef.current = options.skipCache ?? false;
      if (!options.forceTranscoded) {
        losslessFallbackRef.current = false;
      }
      onEndRef.current = onEnd;
      cancelStagedPreloads();
      clearRecoveryTimer();
      unload();
      clearError();
      void onTrackWillChange(track);
      currentTrackRef.current = track;
      startListening(track);
      applyMachine(reducePlaybackMachine(machineRef.current, { type: "LOAD" }));

      let resolved: ResolvedTrackSrc | null;
      try {
        resolved = await resolveTrackSrc(track, loadId, {
          skipCache: options.skipCache,
          forceTranscoded: options.forceTranscoded,
        });
      } catch (err) {
        if (loadIdRef.current !== loadId) return;
        const failure =
          err instanceof ApiError
            ? classifyPlaybackError("api", err, track)
            : classifyPlaybackError("howler", err instanceof Error ? err.message : 2, track);
        setError(failure);
        handleTerminalFailure(track, failure, loadId);
        return;
      }
      if (loadIdRef.current !== loadId || !resolved) return;

      setFromCache(resolved.fromCache);
      setPlaybackQuality(resolved.playbackQuality);
      bindEngine(
        track,
        resolved.src,
        loadId,
        resolved.useLiveOnCacheError,
        resolved.attemptLossless,
        onEnd,
        autoplayOnLoad,
        engineRef.current,
      );

      if (options.initialSeekMs !== undefined && options.initialSeekMs > 0) {
        const seekMs = options.initialSeekMs;
        const seekWhenLoaded = () => {
          if (loadIdRef.current !== loadId) return;
          if (engineRef.current.state() !== "loaded") {
            setTimeout(seekWhenLoaded, 50);
            return;
          }
          engineRef.current.seek(seekMs);
          applyMachine(reducePlaybackMachine(machineRef.current, { type: "SEEK", positionMs: seekMs }));
          updateListenPosition(seekMs);
          onPlaybackPlay(track, seekMs);
        };
        seekWhenLoaded();
      }
    },
    [
      unload,
      clearError,
      bindEngine,
      resolveTrackSrc,
      cancelStagedPreloads,
      applyMachine,
      clearRecoveryTimer,
      handleTerminalFailure,
    ],
  );

  loadTrackRef.current = loadTrack;

  const resumeAutoplay = useCallback(() => {
    void Howler.ctx?.resume();
    setAutoplayBlocked(false);
    engineRef.current.play();
  }, []);

  const play = useCallback(() => {
    clearError();
    usePlaybackQueue.getState().markPlaybackStarted();
    const track = currentTrackRef.current;
    if (engineRef.current.state() === "loaded") {
      applyMachine(reducePlaybackMachine(machineRef.current, { type: "PLAY" }));
    }
    engineRef.current.play();
    if (track) onPlaybackPlay(track, engineRef.current.getPositionMs());
    if (track) notifyRecentlyPlayedOnPlay(track);
  }, [clearError, applyMachine, notifyRecentlyPlayedOnPlay]);

  const pause = useCallback(() => {
    const track = currentTrackRef.current;
    engineRef.current.pause();
    if (engineRef.current.state() === "loaded") {
      applyMachine(reducePlaybackMachine(machineRef.current, { type: "PAUSE" }));
      const ms = engineRef.current.getPositionMs();
      persistPlaybackSessionNow(ms);
      if (track) onPlaybackPause(track, ms);
    }
  }, [applyMachine]);

  const seek = useCallback(
    (ms: number) => {
      const rounded = Math.round(ms);
      pendingSeekMsRef.current = rounded;
      setPosition(rounded);
      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
      seekDebounceRef.current = setTimeout(() => {
        const target = pendingSeekMsRef.current;
        if (target === null) return;
        const track = currentTrackRef.current;
        engineRef.current.seek(target);
        applyMachine(reducePlaybackMachine(machineRef.current, { type: "SEEK", positionMs: target }));
        updateListenPosition(target);
        if (track) onPlaybackPlay(track, target);
        pendingSeekMsRef.current = null;
      }, 150);
    },
    [applyMachine],
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    setItem(StorageKeys.volume, v);
    engineRef.current.setVolume(v);
    stagedForwardRef.current?.engine.setVolume(v);
    stagedBackwardRef.current?.engine.setVolume(v);
  }, []);

  const fadeOut = useCallback(
    (cb: () => void) => {
      const style = getTransitionStyle();
      if (style !== "crossfade" || engineRef.current.state() !== "loaded") {
        cb();
        return;
      }
      const remainingMs = Math.max(
        0,
        engineRef.current.getDurationMs() - engineRef.current.getPositionMs(),
      );
      const fadeMs = Math.min(crossfadeDurationSec * 1000, remainingMs);
      if (fadeMs <= 0) {
        cb();
        return;
      }
      engineRef.current.fadeVolume(volume, 0, fadeMs);
      setTimeout(cb, fadeMs);
    },
    [crossfadeDurationSec, volume],
  );

  const setTerminalHandler = useCallback((handler: ((reason: "ended" | "failed") => void) | undefined) => {
    onTerminalRef.current = handler;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (engine.state() !== "loaded") return;
      engine.syncEndedIfComplete();
      if (status === "playing") {
        const ms = Math.max(engine.getPositionMs(), engine.getMediaPositionMs());
        setPosition(ms);
        updateListenPosition(ms);
      }
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    positionPersistRef.current = setInterval(() => {
      if (status !== "playing" || !usePlaybackQueue.getState().playbackStarted) return;
      persistPlaybackSessionNow(engineRef.current.getPositionMs());
    }, 5000);
    return () => {
      if (positionPersistRef.current) clearInterval(positionPersistRef.current);
    };
  }, [status]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        wallClockRef.current = Date.now();
        return;
      }
      const elapsed = Date.now() - wallClockRef.current;
      if (elapsed > 0 && status === "buffering") {
        const stallStarted = machineRef.current.recovery.stallStartedAt;
        if (stallStarted !== null && stallWindowExceeded(stallStarted, Date.now())) {
          const track = currentTrackRef.current;
          if (track) {
            const attempt = machineRef.current.recovery.attempt;
            if (retriesRemaining(attempt)) {
              scheduleRecovery(track, loadIdRef.current, onEndRef.current);
            }
          }
        }
      }
      const engine = engineRef.current;
      if (engine.state() === "loaded") {
        engine.syncEndedIfComplete();
        const ms = Math.max(engine.getPositionMs(), engine.getMediaPositionMs());
        if (status === "playing" || status === "paused") {
          setPosition(ms);
        }
        const shouldResume =
          usePlaybackQueue.getState().playbackStarted &&
          !engine.isMediaEnded() &&
          (autoplayBlocked || (status === "playing" && !engine.isPlaying()));
        if (shouldResume) {
          void Howler.ctx?.resume();
          setAutoplayBlocked(false);
          engine.play();
        }
      }
    };
    const onPageShow = () => onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [status, scheduleRecovery, autoplayBlocked]);

  useEffect(() => {
    return () => {
      clearRecoveryTimer();
      if (seekDebounceRef.current) {
        clearTimeout(seekDebounceRef.current);
        seekDebounceRef.current = null;
      }
      if (positionPersistRef.current) {
        clearInterval(positionPersistRef.current);
        positionPersistRef.current = null;
      }
      cancelStagedPreloads();
      Howler.stop();
      engineRef.current.destroy();
    };
  }, [cancelStagedPreloads, clearRecoveryTimer]);

  return {
    playing,
    position,
    duration,
    volume,
    fromCache,
    playbackQuality,
    loading,
    status,
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
    setTerminalHandler,
    isTerminalStatus,
  };
}
