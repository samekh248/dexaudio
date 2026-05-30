import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PlaybackAffordance } from "@dexaudio/shared-types";
import { getQueueCurrentTrack, usePlaybackQueue } from "@/stores/playback-queue-store";
import { usePlayer } from "@/contexts/player-context";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import { PlaybackErrorBanner } from "@/components/player/PlaybackErrorBanner";
import { QueuePanel } from "@/components/queue/QueuePanel";
import { prefetchSimilarIfNeeded } from "@/lib/auto-queue";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { isGaplessOrCrossfadeEnabled } from "@/lib/playback-prefs-store";
import { isSessionLevelError } from "@/lib/playback-errors";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { trackArtSrc } from "@/lib/track-art";

export function NowPlayingPage() {
  const navigate = useNavigate();
  const {
    items,
    currentIndex,
    next,
    setIndex,
    removeAt,
    addAutoTracks,
    resetSkipped,
  } = usePlaybackQueue();
  const player = usePlayer();
  const { toggle, next: goNext, previous: goPrevious } = usePlaybackControls();
  const playbackStarted = usePlaybackQueue((s) => s.playbackStarted);
  const current = usePlaybackQueue(getQueueCurrentTrack);
  const displayIndex = playbackStarted ? currentIndex : -1;
  const [queueExhausted, setQueueExhausted] = useState(false);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!current) return;
    void prefetchSimilarIfNeeded(current, items.length - currentIndex).then((tracks) => {
      if (tracks.length) addAutoTracks(tracks);
    });
  }, [current?.id, currentIndex, items.length, addAutoTracks]);

  useEffect(() => {
    if (!player.error) {
      lastErrorRef.current = null;
      return;
    }
    if (player.error.trackId && current?.id && player.error.trackId !== current.id) {
      return;
    }
    const key = `${player.error.category}:${player.error.trackId}:${player.error.timestamp}`;
    if (lastErrorRef.current === key) return;
    lastErrorRef.current = key;

    if (player.autoplayBlocked) return;
    if (isSessionLevelError(player.error.category)) return;
  }, [player.error, player.autoplayBlocked, current?.id]);

  useEffect(() => {
    if (player.playing && !player.loading) {
      player.clearError();
      setQueueExhausted(false);
    }
  }, [player.playing, player.loading]);

  const handleAffordance = (affordance: PlaybackAffordance) => {
    switch (affordance) {
      case "retry":
        if (current) {
          player.clearError();
          void player.loadTrack(current, () => next());
        }
        break;
      case "sign_in":
        navigate("/settings");
        break;
      case "back_to_library":
        navigate("/");
        break;
      case "retry_queue":
        resetSkipped();
        setQueueExhausted(false);
        setIndex(0);
        if (items[0]?.track) {
          void player.loadTrack(items[0].track, () => next());
        }
        break;
      case "play_gesture":
        player.resumeAutoplay();
        break;
      default:
        break;
    }
  };

  const handleQueueSelect = (index: number) => {
    if (index === currentIndex) return;

    player.clearError();

    const targetTrack = items[index]?.track;
    if (targetTrack && isGaplessOrCrossfadeEnabled()) {
      if (index === currentIndex + 1 && player.tryHandoffForward(targetTrack)) {
        setIndex(index);
        return;
      }
      if (index === currentIndex - 1 && player.tryHandoffBackward(targetTrack)) {
        setIndex(index);
        return;
      }
    }

    player.cancelStagedPreloads();
    setIndex(index);
  };

  if (!current) {
    return <p className="text-muted-foreground">Queue is empty. Play something from an album.</p>;
  }

  const artSrc = trackArtSrc(current);

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch">
      <div className="space-y-4">
        {artSrc ? (
          <AspectRatio ratio={1} className="w-full overflow-hidden rounded-lg bg-muted">
            <img
              src={artSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AspectRatio>
        ) : null}
        <h1 className="text-2xl font-bold">{current.title}</h1>
        <p className="text-muted-foreground">
          {current.artist} — {current.album}
        </p>

        {queueExhausted ? (
          <PlaybackErrorBanner
            error={{
              category: "unknown",
              recoverable: false,
              message: "No queued tracks could be played",
              affordances: ["back_to_library", "retry_queue"],
              timestamp: new Date().toISOString(),
            }}
            onAffordance={handleAffordance}
            onDismiss={() => setQueueExhausted(false)}
          />
        ) : null}

        {player.autoplayBlocked ? (
          <div className="rounded-lg border border-border bg-card p-4" role="alert">
            <p className="text-sm mb-3">Your browser blocked autoplay. Tap Play to start audio.</p>
            <Button onClick={() => player.resumeAutoplay()}>Play</Button>
          </div>
        ) : null}

        {player.error && isSessionLevelError(player.error.category) && !queueExhausted ? (
          <PlaybackErrorBanner
            error={player.error}
            onAffordance={handleAffordance}
            onDismiss={() => player.clearError()}
          />
        ) : null}

        <AudioPlayer
          playing={player.playing}
          position={
            player.restorePhase && !player.playing
              ? player.restoredElapsedMs
              : player.position
          }
          duration={player.duration || current.durationMs}
          volume={player.volume}
          fromCache={player.fromCache}
          loading={player.loading}
          status={player.status}
          onPlay={toggle}
          onPause={player.pause}
          onSeek={player.seek}
          onVolume={player.setVolume}
          onNext={goNext}
          onPrevious={goPrevious}
        />
      </div>
      <QueuePanel
        items={items}
        currentIndex={displayIndex}
        onSelect={handleQueueSelect}
        onRemove={removeAt}
      />
    </div>
  );
}
