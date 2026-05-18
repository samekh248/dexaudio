import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";

const POLL_MS = 1500;
const TIMEOUT_MS = 3 * 60 * 1000;

interface SignInStepProps {
  onAuthorized: () => void;
}

export function SignInStep({ onAuthorized }: SignInStepProps) {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [pinId, setPinId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const startedAt = useRef<number>(0);
  const startedRef = useRef(false);

  const openSignIn = useCallback((url: string) => {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup || popup.closed) {
      setPopupBlocked(true);
      return;
    }
    setPopupBlocked(false);
  }, []);

  const startFlow = useCallback(async () => {
    setError(null);
    setTimedOut(false);
    setWaiting(true);
    try {
      const pin = await api.createPlexPin();
      setAuthUrl(pin.authUrl);
      setPinId(pin.pinId);
      startedAt.current = Date.now();
      openSignIn(pin.authUrl);
    } catch (e) {
      setError((e as Error).message);
      setWaiting(false);
    }
  }, [openSignIn]);

  useEffect(() => {
    if (!waiting || pinId == null) return;
    const interval = window.setInterval(async () => {
      if (Date.now() - startedAt.current > TIMEOUT_MS) {
        window.clearInterval(interval);
        setTimedOut(true);
        setWaiting(false);
        return;
      }
      try {
        const status = await api.getPlexPinStatus(pinId);
        if (status.expired) {
          setTimedOut(true);
          setWaiting(false);
          window.clearInterval(interval);
          return;
        }
        if (status.authorized) {
          window.clearInterval(interval);
          setWaiting(false);
          onAuthorized();
        }
      } catch {
        setError("Network error while waiting for sign-in. Retrying…");
      }
    }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [waiting, pinId, onAuthorized]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startFlow();
  }, [startFlow]);

  if (timedOut) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Sign in was not completed.</p>
        <Button type="button" onClick={() => void startFlow()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Complete sign-in in the Plex browser window. This page will continue automatically.
      </p>
      {waiting && (
        <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Waiting for Plex sign-in…
        </div>
      )}
      {popupBlocked && authUrl && (
        <p className="text-sm">
          Popup blocked.{" "}
          <a href={authUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Open sign-in page
          </a>
        </p>
      )}
      {authUrl && (
        <Button type="button" variant="outline" size="sm" onClick={() => openSignIn(authUrl)}>
          Open sign-in page again
        </Button>
      )}
      {error && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{error}</p>
          <Button type="button" variant="outline" onClick={() => void startFlow()}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
