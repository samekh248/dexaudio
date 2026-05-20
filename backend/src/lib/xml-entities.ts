const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntity(entity: string): string {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const code = Number.parseInt(entity.slice(2), 16);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return `&${entity};`;
    try {
      return String.fromCodePoint(code);
    } catch {
      return `&${entity};`;
    }
  }
  if (entity.startsWith("#")) {
    const code = Number.parseInt(entity.slice(1), 10);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return `&${entity};`;
    try {
      return String.fromCodePoint(code);
    } catch {
      return `&${entity};`;
    }
  }
  return NAMED_ENTITIES[entity] ?? `&${entity};`;
}

/** Decode XML/HTML entities in Plex attribute values (e.g. &#39; → '). */
export function decodeXmlEntities(text: string): string {
  if (!text.includes("&")) return text;
  let out = text;
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (_, entity: string) =>
      decodeEntity(entity),
    );
    if (next === out) break;
    out = next;
  }
  return out;
}
