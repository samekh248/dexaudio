import { useEffect } from "react";
import { usePlaybackQueue } from "@/stores/playback-queue-store";
import { usePlayer } from "@/hooks/use-player";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import { QueuePanel } from "@/components/queue/QueuePanel";
import { prefetchSimilarIfNeeded } from "@/lib/auto-queue";
import { preCacheUpcoming } from "@/lib/pre-cache-worker";

export function NowPlayingPage() {
  const { items, currentIndex, next, previous, setIndex, removeAt, addAutoTracks } =
    usePlaybackQueue();
  const player = usePlayer();
  const current = items[currentIndex]?.track;

  useEffect(() => {
    if (!current) return;
    void player.loadTrack(current, () => {
      next();
      player.play();
    });
    void preCacheUpcoming(
      items.map((i) => i.track),
      currentIndex,
    );
    void prefetchSimilarIfNeeded(current, items.length - currentIndex).then((tracks) => {
      if (tracks.length) addAutoTracks(tracks);
    });
  }, [current?.id]);

  if (!current) {
    return <p className="text-muted-foreground">Queue is empty. Play something from an album.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{current.title}</h1>
        <p className="text-muted-foreground">{current.artist} — {current.album}</p>
        <AudioPlayer
          playing={player.playing}
          position={player.position}
          duration={player.duration || current.durationMs}
          volume={player.volume}
          fromCache={player.fromCache}
          onPlay={player.play}
          onPause={player.pause}
          onSeek={player.seek}
          onVolume={player.setVolume}
          onNext={() => player.fadeOut(() => next())}
          onPrevious={previous}
        />
      </div>
      <QueuePanel
        items={items}
        currentIndex={currentIndex}
        onSelect={setIndex}
        onRemove={removeAt}
      />
    </div>
  );
}
