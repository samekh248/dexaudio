import { useCallback } from "react";
import { usePlayer } from "@/contexts/player-context";
import { getQueueCurrentTrack, usePlaybackQueue } from "@/stores/playback-queue-store";
import { isGaplessPlaybackEnabled } from "@/lib/local-storage";

export function usePlaybackControls() {
  const player = usePlayer();
  const currentIndex = usePlaybackQueue((s) => s.currentIndex);
  const items = usePlaybackQueue((s) => s.items);
  const next = usePlaybackQueue((s) => s.next);
  const previous = usePlaybackQueue((s) => s.previous);
  const current = usePlaybackQueue(getQueueCurrentTrack);

  const handleNext = useCallback(() => {
    const nextTrack = items[currentIndex + 1]?.track;
    if (isGaplessPlaybackEnabled() && nextTrack && player.tryHandoffForward(nextTrack)) {
      next();
      return;
    }
    player.fadeOut(() => next());
  }, [items, currentIndex, next, player]);

  const handlePrevious = useCallback(() => {
    if (currentIndex === 0 && player.playing) {
      player.seek(0);
      return;
    }
    const prevTrack = items[currentIndex - 1]?.track;
    if (isGaplessPlaybackEnabled() && prevTrack && player.tryHandoffBackward(prevTrack)) {
      previous();
      return;
    }
    previous();
  }, [currentIndex, items, player, previous]);

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
