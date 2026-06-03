import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cast, RefreshCw } from "lucide-react";
import type { NetworkPlayer } from "@dexaudio/shared-types";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  usePlaybackOutputStore,
  type PlaybackOutputStore,
} from "@/lib/playback-output-store";
import { selectLocalOutput } from "@/lib/network-playback-orchestrator";
import { useNetworkCastPrefs } from "@/lib/network-cast-prefs-store";
import { cn } from "@/lib/utils";

function outputValue(pref: PlaybackOutputStore["preference"]): string {
  return pref.mode === "local" ? "local" : pref.clientIdentifier;
}

function PlaybackOutputSelectorContent({
  open,
  onSelected,
}: {
  open: boolean;
  onSelected?: () => void;
}) {
  const preference = usePlaybackOutputStore((s) => s.preference);
  const selectNetwork = usePlaybackOutputStore((s) => s.selectNetwork);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["plex-players"],
    queryFn: () => api.getPlexPlayers(true),
    enabled: open,
    staleTime: 30_000,
  });

  const allPlayers = data?.players ?? [];
  const players = allPlayers.filter((p) => p.reachable);
  const unreachable = allPlayers.filter((p) => !p.reachable);
  const value = outputValue(preference);

  const emptyHint =
    data?.emptyReason === "no_players"
      ? "No Plex music players are connected to your server. Open Plexamp or Plex Web, sign in to the same server, and enable remote control in player settings."
      : data?.emptyReason === "remote_control_disabled"
        ? "Players were found but remote control is off or unreachable. Enable remote control in Plexamp or Plex Web, then refresh."
        : data?.emptyReason === "server_unreachable"
          ? "Could not reach your Plex server. Check Settings → Plex."
          : "No network players found. Enable remote control on Plexamp or Plex Web on your LAN, then refresh.";

  const handleChange = async (next: string) => {
    if (next === "local") {
      await selectLocalOutput();
    } else {
      const player = players.find((p) => p.clientIdentifier === next);
      if (player) selectNetwork(player);
    }
    onSelected?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Refresh players"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Discovering players…
        </p>
      ) : (
        <RadioGroup
          value={value}
          onValueChange={(v) => void handleChange(v)}
          aria-labelledby="playback-output-label"
          role="radiogroup"
          aria-label="Playback output"
          className="gap-3"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="local" id="output-local" />
            <Label htmlFor="output-local" className="font-normal cursor-pointer">
              This device
            </Label>
          </div>
          {players.map((p: NetworkPlayer) => (
            <div key={p.clientIdentifier} className="flex items-center gap-2">
              <RadioGroupItem value={p.clientIdentifier} id={`output-${p.clientIdentifier}`} />
              <Label
                htmlFor={`output-${p.clientIdentifier}`}
                className="font-normal cursor-pointer"
              >
                {p.name} — {p.product}
              </Label>
            </div>
          ))}
          {unreachable.map((p: NetworkPlayer) => (
            <div key={p.clientIdentifier} className="flex items-center gap-2 opacity-60">
              <RadioGroupItem
                value={p.clientIdentifier}
                id={`output-${p.clientIdentifier}`}
                disabled
              />
              <Label htmlFor={`output-${p.clientIdentifier}`} className="font-normal">
                {p.name} — {p.product} (remote control unavailable)
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {!isLoading && allPlayers.length === 0 && !isError ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : null}

      {isError ? (
        <p className="text-xs text-destructive">Could not load players. Check Plex connection.</p>
      ) : null}
    </div>
  );
}

export function PlaybackOutputDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle id="playback-output-label">Playback output</DialogTitle>
          <DialogDescription>
            Play audio on this device or on a Plex player on your network.
          </DialogDescription>
        </DialogHeader>
        <PlaybackOutputSelectorContent
          open={open}
          onSelected={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function PlaybackOutputCastButton({ className }: { className?: string }) {
  const castEnabled = useNetworkCastPrefs((s) => s.enabled);
  const [open, setOpen] = useState(false);
  const networkMode = usePlaybackOutputStore((s) => s.preference.mode === "network");
  const networkName = usePlaybackOutputStore((s) =>
    s.preference.mode === "network" ? s.preference.displayName : null,
  );

  if (!castEnabled) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-9 w-9 shrink-0", className)}
        aria-label={
          networkName
            ? `Playback output: ${networkName}. Change output`
            : "Choose playback output"
        }
        aria-pressed={networkMode}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Cast className={cn("h-5 w-5", networkMode && "text-primary")} aria-hidden />
      </Button>
      <PlaybackOutputDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
