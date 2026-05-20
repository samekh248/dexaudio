import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { getItem, setItem, StorageKeys, type GaplessPlaybackPreference } from "@/lib/local-storage";
import { toast } from "@/components/ui/sonner";

export function PlaybackSettingsSection() {
  const [autoQueue, setAutoQueue] = useState(getItem(StorageKeys.autoQueueSimilar, true));
  const [crossfade, setCrossfade] = useState(getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 }));
  const [gapless, setGapless] = useState(
    getItem<GaplessPlaybackPreference>(StorageKeys.gaplessPlayback, { enabled: true }),
  );
  const [preCache, setPreCache] = useState(getItem(StorageKeys.preCacheLookAhead, 3));

  return (
    <section className="space-y-4 max-w-lg">
      <label className="flex items-center justify-between gap-4">
        <span className="space-y-1">
          <span className="block">Gapless playback</span>
          <span id="gapless-desc" className="block text-sm text-muted-foreground font-normal">
            Preload the next track so album and queue transitions play without a pause.
          </span>
        </span>
        <Switch
          checked={gapless.enabled}
          aria-describedby="gapless-desc"
          onCheckedChange={(v) => {
            const next: GaplessPlaybackPreference = { enabled: v };
            setGapless(next);
            setItem(StorageKeys.gaplessPlayback, next);
            if (v && crossfade.enabled) {
              const off = { ...crossfade, enabled: false };
              setCrossfade(off);
              setItem(StorageKeys.crossfade, off);
              toast("Crossfade turned off — it cannot run with gapless playback.");
            }
          }}
        />
      </label>
      <label className="flex items-center justify-between">
        <span>Auto-queue similar tracks</span>
        <Switch checked={autoQueue} onCheckedChange={(v) => { setAutoQueue(v); setItem(StorageKeys.autoQueueSimilar, v); }} />
      </label>
      <label className="flex items-center justify-between">
        <span>Crossfade</span>
        <Switch
          checked={crossfade.enabled}
          onCheckedChange={(v) => {
            const next = { ...crossfade, enabled: v };
            setCrossfade(next);
            setItem(StorageKeys.crossfade, next);
            if (v && gapless.enabled) {
              const off: GaplessPlaybackPreference = { enabled: false };
              setGapless(off);
              setItem(StorageKeys.gaplessPlayback, off);
              toast("Gapless playback turned off — it cannot run with crossfade.");
            }
          }}
        />
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
