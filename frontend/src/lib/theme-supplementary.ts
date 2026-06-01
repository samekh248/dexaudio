const MAX_BYTES = 16_384;
const STYLE_ID = "dexaudio-theme-supplement";

const BLOCKLIST = [
  "@import",
  "url(",
  "javascript:",
  "expression(",
  "behavior:",
  "-moz-binding",
  "<script",
  "@charset",
] as const;

const ALLOWED_SELECTORS = [":root", '[data-theme="custom"]', 'html[data-theme="custom"]'];

export type SupplementarySanitizeResult =
  | { ok: true; css: string; stripped: boolean }
  | { ok: false; error: string };

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function hasBlockedContent(css: string): string | null {
  const lower = css.toLowerCase();
  for (const token of BLOCKLIST) {
    if (lower.includes(token)) return token;
  }
  return null;
}

function isAllowedSelector(selector: string): boolean {
  const trimmed = selector.trim();
  return ALLOWED_SELECTORS.some((s) => trimmed === s || trimmed.startsWith(s));
}

/** Keep only declaration blocks with allowed selectors */
function filterRules(css: string): { css: string; stripped: boolean } {
  const parts = css.split("}");
  const kept: string[] = [];
  let stripped = false;
  for (const part of parts) {
    const chunk = part.trim();
    if (!chunk) continue;
    const brace = chunk.indexOf("{");
    if (brace === -1) {
      stripped = true;
      continue;
    }
    const selector = chunk.slice(0, brace).trim();
    const body = chunk.slice(brace + 1).trim();
    if (!body) continue;
    if (isAllowedSelector(selector)) {
      kept.push(`${selector} { ${body} }`);
    } else {
      stripped = true;
    }
  }
  return { css: kept.join("\n"), stripped };
}

export function sanitizeSupplementaryRules(raw: string): SupplementarySanitizeResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, css: "", stripped: false };

  if (byteLength(trimmed) > MAX_BYTES) {
    return { ok: false, error: "Supplementary rules exceed 16 KB limit." };
  }

  const blocked = hasBlockedContent(trimmed);
  if (blocked) {
    return { ok: false, error: `Disallowed content: ${blocked}` };
  }

  const { css, stripped } = filterRules(trimmed);
  return { ok: true, css, stripped };
}

export function injectSupplementaryRules(css: string): void {
  const head = document.head;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    el.setAttribute("data-theme-supplement", "");
    head.appendChild(el);
  }
  el.textContent = css;
}

export function clearSupplementaryRules(): void {
  document.getElementById(STYLE_ID)?.remove();
}
