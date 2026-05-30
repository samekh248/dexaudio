import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { AudioVisualizerIcon } from "@/components/layout/AudioVisualizerIcon";
import { NowPlayingControlPanel } from "@/components/layout/NowPlayingControlPanel";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { useHoverIntent } from "@/hooks/use-hover-intent";

const nowPlayingNav = { to: "/now-playing", label: "Now Playing" };

export function NowPlayingNav({
  isActive,
  playing,
  navLinkClass,
}: {
  isActive: boolean;
  playing: boolean;
  navLinkClass: (active: boolean) => string;
}) {
  const { current, playing: isPlaying, toggle, next, previous } = usePlaybackControls();
  const hasTrack = current !== null;
  const { open, regionProps, linkTouchProps } = useHoverIntent({ enabled: hasTrack });

  return (
    <div {...regionProps} className="relative shrink-0">
      <Link
        to={nowPlayingNav.to}
        className={navLinkClass(isActive)}
        {...(hasTrack ? linkTouchProps : {})}
      >
        {playing ? (
          <AudioVisualizerIcon />
        ) : (
          <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        {nowPlayingNav.label}
      </Link>
      {hasTrack && current ? (
        <NowPlayingControlPanel
          open={open}
          current={current}
          playing={isPlaying}
          onToggle={toggle}
          onNext={next}
          onPrevious={previous}
        />
      ) : null}
    </div>
  );
}
