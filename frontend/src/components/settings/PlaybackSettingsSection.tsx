import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { getItem, setItem, StorageKeys } from "@/lib/local-storage";

export function PlaybackSettingsSection() {
  const [autoQueue, setAutoQueue] = useState(getItem(StorageKeys.autoQueueSimilar, true));
  const [crossfade, setCrossfade] = useState(getItem(StorageKeys.crossfade, { enabled: false, durationSec: 3 }));
  const [preCache, setPreCache] = useState(getItem(StorageKeys.preCacheLookAhead, 3));

  return (
    <section className="space-y-4 max-w-lg">
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
