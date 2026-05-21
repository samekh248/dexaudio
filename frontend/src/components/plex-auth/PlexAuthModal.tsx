import { useLayoutEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { PlexServerInfo } from "@dexaudio/shared-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api-client";
import { clearAllClientData } from "@/lib/indexed-db";
import { clearPlaybackSession } from "@/lib/playback-session";
import { removeItem, setActiveLibraryId, StorageKeys } from "@/lib/local-storage";
import { SignInStep } from "./SignInStep";
import { ServerSelectStep } from "./ServerSelectStep";
import { LibrarySelectStep } from "./LibrarySelectStep";

export type PlexAuthMode = "onboarding" | "settings";

type Step = "signin" | "servers" | "libraries";

const STEP_LABELS: Record<Step, string> = {
  signin: "Sign in",
  servers: "Select server",
  libraries: "Select libraries",
};

const STEP_ORDER: Step[] = ["signin", "servers", "libraries"];

interface PlexAuthModalProps {
  open: boolean;
  mode: PlexAuthMode;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function PlexAuthModal({ open, mode, onOpenChange, onComplete }: PlexAuthModalProps) {
  const [step, setStep] = useState<Step>("signin");
  const [selectedServer, setSelectedServer] = useState<PlexServerInfo | null>(null);
  const [libraryIds, setLibraryIds] = useState<string[]>([]);

  const stepIndex = STEP_ORDER.indexOf(step) + 1;

  const complete = useMutation({
    mutationFn: () =>
      api.completePlexAuth({
        machineIdentifier: selectedServer!.machineIdentifier,
        libraryIds,
      }),
    onSuccess: async (result) => {
      if (result.dataWiped) {
        await clearAllClientData();
        clearPlaybackSession();
        removeItem(StorageKeys.activeLibraryId);
      }
      if (result.connection.libraryIds?.[0]) {
        setActiveLibraryId(result.connection.libraryIds[0]);
      }
      onOpenChange(false);
      onComplete();
    },
  });

  useLayoutEffect(() => {
    if (open) {
      setStep("signin");
      setSelectedServer(null);
      setLibraryIds([]);
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && mode === "onboarding") return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (mode === "onboarding") e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (mode === "onboarding") e.preventDefault();
        }}
        aria-describedby="plex-auth-desc"
      >
        <DialogHeader>
          <DialogTitle>Connect Plex</DialogTitle>
          <DialogDescription id="plex-auth-desc">
            Step {stepIndex} of 3: {STEP_LABELS[step]}
          </DialogDescription>
        </DialogHeader>

        {step === "signin" && (
          <SignInStep onAuthorized={() => setStep("servers")} />
        )}

        {step === "servers" && (
          <ServerSelectStep
            selectedId={selectedServer?.machineIdentifier ?? null}
            onSelect={(server) => setSelectedServer(server)}
          />
        )}

        {step === "libraries" && selectedServer && (
          <LibrarySelectStep
            machineId={selectedServer.machineIdentifier}
            selectedIds={libraryIds}
            onChange={setLibraryIds}
          />
        )}

        <div className="flex justify-between gap-2 pt-2">
          <div>
            {step !== "signin" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === "libraries") setStep("servers");
                  else if (step === "servers") setStep("signin");
                }}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {mode === "settings" && (
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            )}
            {step === "servers" && (
              <Button
                type="button"
                disabled={!selectedServer?.online}
                onClick={() => setStep("libraries")}
              >
                Continue
              </Button>
            )}
            {step === "libraries" && (
              <Button
                type="button"
                disabled={libraryIds.length === 0 || complete.isPending}
                onClick={() => complete.mutate()}
              >
                {complete.isPending ? "Saving…" : "Finish"}
              </Button>
            )}
          </div>
        </div>
        {complete.isError && (
          <p className="text-sm text-red-500">{(complete.error as Error).message}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
