import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getItem,
  getPlayNavigationMode,
  setItem,
  StorageKeys,
  type PlayNavigationMode,
} from "@/lib/local-storage";
import { usePlaybackPrefs } from "@/lib/playback-prefs-store";
import type { TransitionStyle } from "@dexaudio/shared-types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type TrackTransitionMode = TransitionStyle;

const TRACK_TRANSITION_DESCRIPTIONS: Record<TrackTransitionMode, string> = {
  none: "Play tracks with a brief pause between them.",
  gapless: "Preload the next track so album and queue transitions play without a pause.",
  crossfade: "Fade out the current track as the next one begins.",
};

export function PlaybackSettingsSection() {
  const [playNavigation, setPlayNavigation] = useState<PlayNavigationMode>(getPlayNavigationMode());
  const [autoQueue, setAutoQueue] = useState(getItem(StorageKeys.autoQueueSimilar, true));
  const transition = usePlaybackPrefs((s) => s.transition);
  const crossfadeDurationSec = usePlaybackPrefs((s) => s.crossfadeDurationSec);
  const setTransition = usePlaybackPrefs((s) => s.setTransition);
  const setCrossfadeDuration = usePlaybackPrefs((s) => s.setCrossfadeDuration);
  const [preCache, setPreCache] = useState(getItem(StorageKeys.preCacheLookAhead, 3));

  const trackTransition = transition;

  return (
    <section className="space-y-4 max-w-lg">
      <fieldset className="space-y-3">
        <legend id="play-navigation-label" className="text-sm font-medium">
          When starting playback
        </legend>
        <RadioGroup
          aria-labelledby="play-navigation-label"
          value={playNavigation}
          onValueChange={(value) => {
            const mode = value as PlayNavigationMode;
            setPlayNavigation(mode);
            setItem(StorageKeys.playNavigation, mode);
          }}
          className="space-y-3"
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem
              value="navigate"
              id="play-navigation-navigate"
              aria-describedby="play-navigation-navigate-desc"
            />
            <div className="space-y-1">
              <Label htmlFor="play-navigation-navigate">Go to Now Playing</Label>
              <p id="play-navigation-navigate-desc" className="text-sm font-normal text-muted-foreground">
                Open the Now Playing page when you start music from the library.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem
              value="stay"
              id="play-navigation-stay"
              aria-describedby="play-navigation-stay-desc"
            />
            <div className="space-y-1">
              <Label htmlFor="play-navigation-stay">Stay on current page</Label>
              <p id="play-navigation-stay-desc" className="text-sm font-normal text-muted-foreground">
                Keep browsing while playback starts; use the header Now Playing link when you want the full view.
              </p>
            </div>
          </div>
        </RadioGroup>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="track-transition">Track transition</Label>
        <Select
          value={trackTransition}
          onValueChange={(value) => {
            setTransition(value as TrackTransitionMode);
          }}
        >
          <SelectTrigger id="track-transition" aria-describedby="track-transition-desc">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Standard</SelectItem>
            <SelectItem value="gapless">Gapless playback</SelectItem>
            <SelectItem value="crossfade">Crossfade</SelectItem>
          </SelectContent>
        </Select>
        <p id="track-transition-desc" className="text-sm text-muted-foreground">
          {TRACK_TRANSITION_DESCRIPTIONS[trackTransition]}
        </p>
      </div>
      <label className="flex items-center justify-between gap-4">
        <span>Auto-queue similar tracks</span>
        <Switch checked={autoQueue} onCheckedChange={(v) => { setAutoQueue(v); setItem(StorageKeys.autoQueueSimilar, v); }} />
      </label>
      <div className="space-y-2">
        <Label>Pre-cache look-ahead (tracks)</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={preCache}
          onChange={(e) => {
            const n = Number(e.target.value);
            setPreCache(n);
            setItem(StorageKeys.preCacheLookAhead, n);
          }}
        />
      </div>
    </section>
  );
}

