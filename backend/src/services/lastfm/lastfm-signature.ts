import { createHash } from "node:crypto";

/**
 * Builds the Last.fm API signature: md5 of every request param (except
 * `format`, `callback`, and `api_sig`) sorted by name and concatenated as
 * `name+value`, followed by the shared secret.
 * See https://www.last.fm/api/authspec#_8-signing-calls
 */
export function signParams(params: Record<string, string>, secret: string): string {
  const signatureBase = Object.keys(params)
    .filter((key) => key !== "format" && key !== "callback" && key !== "api_sig")
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return createHash("md5").update(`${signatureBase}${secret}`, "utf8").digest("hex");
}
