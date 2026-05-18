import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MatchOverrideDialogProps {
  releaseId: number;
  onSave: (plexAlbumId: string | null, status: "matched" | "partial" | "not_on_plex") => void;
  onClose: () => void;
}

export function MatchOverrideDialog({ releaseId, onSave, onClose }: MatchOverrideDialogProps) {
  const [plexAlbumId, setPlexAlbumId] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Override match #{releaseId}</h2>
        <div className="space-y-2 mb-4">
          <Label htmlFor="plexAlbum">Plex album ID</Label>
          <Input id="plexAlbum" value={plexAlbumId} onChange={(e) => setPlexAlbumId(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(plexAlbumId || null, "matched")}>Save</Button>
        </div>
      </div>
    </div>
  );
}
