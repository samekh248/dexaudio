import { useCallback } from "react";
import { usePlayer } from "@/contexts/player-context";
import { getQueueCurrentTrack, usePlaybackQueue } from "@/stores/playback-queue-store";
import { getTransitionStyle } from "@/lib/playback-prefs-store";

const PREVIOUS_RESTART_MS = 3000;

export function usePlaybackControls() {
  const player = usePlayer();
  const currentIndex = usePlaybackQueue((s) => s.currentIndex);
  const items = usePlaybackQueue((s) => s.items);
  const next = usePlaybackQueue((s) => s.next);
  const previous = usePlaybackQueue((s) => s.previous);
  const advanceAfterHandoff = usePlaybackQueue((s) => s.advanceAfterHandoff);
  const current = usePlaybackQueue(getQueueCurrentTrack);

  const handleNext = useCallback(() => {
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
  }, [items, currentIndex, next, player, advanceAfterHandoff]);

  const handlePrevious = useCallback(() => {
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
  }, [currentIndex, items, player, previous, advanceAfterHandoff]);

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
