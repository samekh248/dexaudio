import type { QueueItem } from "@/stores/playback-queue-store";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface QueuePanelProps {
  items: QueueItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
}

export function QueuePanel({ items, currentIndex, onSelect, onRemove }: QueuePanelProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Queue</h2>
      <ul className="space-y-1 max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <li
            key={`${item.track.id}-${index}`}
            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
              index === currentIndex ? "border-primary bg-accent/30" : "border-border"
            }`}
          >
            <button type="button" className="flex-1 text-left" onClick={() => onSelect(index)}>
              <span className="font-medium">{item.track.title}</span>
              <span className="block text-xs text-muted-foreground">{item.track.artist}</span>
              {item.source === "auto" && (
                <span className="text-xs text-muted-foreground">Auto-queued</span>
              )}
            </button>
            <Button variant="ghost" size="icon" onClick={() => onRemove(index)} aria-label="Remove">
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
