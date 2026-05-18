import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCacheUsage, clearPreCache, clearAllCache } from "@/lib/cache-service";
import { bytesToGb } from "@/lib/cache-lru";
import { getItem, setItem, StorageKeys } from "@/lib/local-storage";

export function StorageSettingsSection() {
  const [usage, setUsage] = useState({ preBytes: 0, permanentBytes: 0 });
  const [preCap, setPreCap] = useState(getItem(StorageKeys.preCapGb, 2));
  const [permCap, setPermCap] = useState(getItem(StorageKeys.permanentCapGb, 10));

  const refresh = () => void getCacheUsage().then(setUsage);
  useEffect(() => { refresh(); }, []);

  return (
    <section className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Pre-cache: {bytesToGb(usage.preBytes).toFixed(2)} GB / {preCap} GB cap
        <br />
        Permanent: {bytesToGb(usage.permanentBytes).toFixed(2)} GB / {permCap} GB cap
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Pre-cache cap (GB)</Label>
          <Input type="number" value={preCap} onChange={(e) => { const v = Number(e.target.value); setPreCap(v); setItem(StorageKeys.preCapGb, v); }} />
        </div>
        <div className="space-y-2">
          <Label>Permanent cap (GB)</Label>
          <Input type="number" value={permCap} onChange={(e) => { const v = Number(e.target.value); setPermCap(v); setItem(StorageKeys.permanentCapGb, v); }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => clearPreCache().then(refresh)}>Clear pre-cache</Button>
        <Button variant="outline" onClick={() => clearAllCache().then(refresh)}>Clear everything</Button>
      </div>
    </section>
  );
}
