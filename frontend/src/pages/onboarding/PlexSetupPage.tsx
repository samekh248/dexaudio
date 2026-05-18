import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlexAuthModal } from "@/components/plex-auth/PlexAuthModal";

export function PlexSetupPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h1 className="text-2xl font-bold">Connect Plex</h1>
      <p className="text-sm text-muted-foreground">
        Sign in with your Plex account to browse your music libraries. No manual tokens required.
      </p>
      <Button type="button" size="lg" onClick={() => setModalOpen(true)}>
        Sign in with Plex
      </Button>
      <PlexAuthModal
        open={modalOpen}
        mode="onboarding"
        onOpenChange={setModalOpen}
        onComplete={() => navigate("/")}
      />
    </div>
  );
}
