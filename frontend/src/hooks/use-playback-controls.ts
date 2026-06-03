import { useCallback } from "react";
import { usePlayer } from "@/contexts/player-context";
import { getQueueCurrentTrack, usePlaybackQueue } from "@/stores/playback-queue-store";
import { getTransitionStyle } from "@/lib/playback-prefs-store";
import { usePlaybackOutputStore } from "@/lib/playback-output-store";
import { controlNetwork } from "@/lib/network-playback-orchestrator";

const PREVIOUS_RESTART_MS = 3000;

export function usePlaybackControls() {
  const player = usePlayer();
  const currentIndex = usePlaybackQueue((s) => s.currentIndex);
  const items = usePlaybackQueue((s) => s.items);
  const next = usePlaybackQueue((s) => s.next);
  const previous = usePlaybackQueue((s) => s.previous);
  const advanceAfterHandoff = usePlaybackQueue((s) => s.advanceAfterHandoff);
  const current = usePlaybackQueue(getQueueCurrentTrack);
  const networkMode = usePlaybackOutputStore((s) => s.isNetworkMode());

  const handleNext = useCallback(() => {
    if (networkMode) {
      void controlNetwork("skipNext");
      next();
      return;
    }
    const nextTrack = items[currentIndex + 1]?.track;
    const style = getTransitionStyle();
    if ((style === "gapless" || style === "crossfade") && nextTrack && player.tryHandoffForward(nextTrack)) {
      if (style === "crossfade") {
        player.fadeOut(() => advanceAfterHandoff("forward"));
      } else {
        advanceAfterHandoff("forward");
      }
      return;
    }
    if (style === "crossfade") {
      player.fadeOut(() => next());
    } else {
      next();
    }
  }, [items, currentIndex, next, player, advanceAfterHandoff, networkMode]);

  const handlePrevious = useCallback(() => {
    if (networkMode) {
      if (player.position > PREVIOUS_RESTART_MS) {
        void controlNetwork("seek", 0);
        player.seek(0);
        return;
      }
      void controlNetwork("skipPrevious");
      previous();
      return;
    }
    if (player.position > PREVIOUS_RESTART_MS) {
      player.seek(0);
      return;
    }
    if (currentIndex === 0) {
      player.seek(0);
      return;
    }
    const prevTrack = items[currentIndex - 1]?.track;
    const style = getTransitionStyle();
    if ((style === "gapless" || style === "crossfade") && prevTrack && player.tryHandoffBackward(prevTrack)) {
      advanceAfterHandoff("backward");
      return;
    }
    previous();
  }, [currentIndex, items, player, previous, advanceAfterHandoff, networkMode]);

  const toggle = useCallback(() => {
    if (player.autoplayBlocked) {
      player.resumeAutoplay();
    } else if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  return {
    current: current ?? null,
    playing: player.playing,
    toggle,
    next: handleNext,
    previous: handlePrevious,
  };
}
