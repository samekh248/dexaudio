/** FR-024/025: strip leading English article "The " for sort key only. */
export function sortKeyForTitle(title: string): string {
  const trimmed = title.trimStart();
  if (/^the\s+\S/i.test(trimmed)) {
    return trimmed.replace(/^the\s+/i, "").toLocaleLowerCase();
  }
  return trimmed.toLocaleLowerCase();
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function compareAlbumTitles(aTitle: string, bTitle: string): number {
  return collator.compare(sortKeyForTitle(aTitle), sortKeyForTitle(bTitle));
}
