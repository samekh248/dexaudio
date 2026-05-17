import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaskedSecretInput } from "./MaskedSecretInput";
import { api } from "@/services/api-client";

export function LastfmSettingsSection() {
  const [sessionKey, setSessionKey] = useState("");

  return (
    <section className="space-y-4 max-w-lg">
      <MaskedSecretInput id="lastfm-sk" label="Session key" value={sessionKey} onChange={setSessionKey} />
      <div className="flex gap-2">
        <Button
          onClick={() =>
            fetch("/api/v1/lastfm/connection", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionKey }),
            })
          }
        >
          Connect
        </Button>
        <Button variant="outline" onClick={() => api.retryScrobbles()}>
          Retry pending
        </Button>
      </div>
    </section>
  );
}
