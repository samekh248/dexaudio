import type { PlexTimelineInput } from "@dexaudio/shared-types";
import { PLEX_PRODUCT_NAME } from "../../lib/config.js";
import type { PlexConfig } from "./plex-client.js";
import { plexMediaHeaders } from "./plex-client.js";

const LIBRARY_IDENTIFIER = "com.plexapp.plugins.library";

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** Build query string for Plex GET /:/timeline (exported for unit tests). */
export function buildTimelineSearchParams(input: PlexTimelineInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("ratingKey", input.ratingKey);
  params.set("key", `/library/metadata/${input.ratingKey}`);
  params.set("state", input.state);
  params.set("time", String(Math.max(0, Math.floor(input.timeMs))));
  params.set("duration", String(Math.max(0, Math.floor(input.durationMs))));
  params.set("sessionKey", String(input.sessionKey));
  params.set("identifier", LIBRARY_IDENTIFIER);
  params.set("includeMarkers", "1");
  params.set("includeChapters", "1");
  return params;
}

export function timelineRequestHeaders(token: string): Record<string, string> {
  return {
    ...plexMediaHeaders(token),
    "X-Plex-Product": PLEX_PRODUCT_NAME,
    "X-Plex-Device-Name": PLEX_PRODUCT_NAME,
  };
}

export async function reportTimeline(
  config: PlexConfig,
  input: PlexTimelineInput,
  timeoutMs = 8000,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = normalizeUrl(config.serverUrl);
  const params = buildTimelineSearchParams(input);
  if (config.machineIdentifier) {
    params.set("machineIdentifier", config.machineIdentifier);
  }
  const url = `${base}/:/timeline?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: timelineRequestHeaders(config.token),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `Plex timeline HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Plex timeline request failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
