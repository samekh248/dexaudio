import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedSecretInput } from "./MaskedSecretInput";
import { api } from "@/services/api-client";

export function DiscogsSettingsSection() {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");

  return (
    <section className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label>Username</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <MaskedSecretInput id="discogs-token" label="Token" value={token} onChange={setToken} />
      <Button
        onClick={() => api.saveDiscogsConnection(username, token)}
        disabled={!username || !token}
      >
        Save Discogs credentials
      </Button>
    </section>
  );
}
