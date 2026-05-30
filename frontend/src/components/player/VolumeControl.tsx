import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface VolumeControlProps {
  volume: number;
  onVolume: (v: number) => void;
  forceClosed?: boolean;
  className?: string;
  iconClassName?: string;
}

export function VolumeControl({
  volume,
  onVolume,
  forceClosed,
  className,
  iconClassName = "h-4 w-4",
}: VolumeControlProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceClosed) setOpen(false);
  }, [forceClosed]);

  const popoverOpen = open && !forceClosed;
  const muted = volume === 0;
  const Icon = muted ? VolumeX : Volume2;
  return (
    <Popover.Root open={popoverOpen} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 shrink-0", className)}
          aria-label={muted ? "Volume muted" : "Volume"}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon className={iconClassName} aria-hidden />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          align="center"
          className="z-[60] rounded-md border border-border bg-card p-3 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <Slider
            orientation="vertical"
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => onVolume(v / 100)}
            aria-label="Volume"
            className="h-28"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
