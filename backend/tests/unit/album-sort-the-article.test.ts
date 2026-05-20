import { describe, expect, it } from "vitest";
import { compareAlbumTitles, sortKeyForTitle } from "../../src/services/plex/album-sort.js";

const THE_FIXTURE: Array<{ title: string; sortKey: string }> = [
  { title: "Abbey Road", sortKey: "abbey road" },
  { title: "The Wall", sortKey: "wall" },
  { title: "The Beatles - Revolver", sortKey: "beatles - revolver" },
  { title: "Revolver", sortKey: "revolver" },
  { title: "A Night at the Opera", sortKey: "a night at the opera" },
  { title: "An Innocent Man", sortKey: "an innocent man" },
  { title: "The", sortKey: "the" },
  { title: "9 Crimes", sortKey: "9 crimes" },
  { title: "10 Days", sortKey: "10 days" },
  { title: "...And Justice for All", sortKey: "...and justice for all" },
  { title: "THE DARK SIDE OF THE MOON", sortKey: "dark side of the moon" },
  { title: "the who sell out", sortKey: "who sell out" },
  { title: "Help!", sortKey: "help!" },
  { title: "Ziggy Stardust", sortKey: "ziggy stardust" },
  { title: "The Queen Is Dead", sortKey: "queen is dead" },
  { title: "Nevermind", sortKey: "nevermind" },
  { title: "OK Computer", sortKey: "ok computer" },
  { title: "The Suburbs", sortKey: "suburbs" },
  { title: "Random Access Memories", sortKey: "random access memories" },
  { title: "The Less I Know The Better", sortKey: "less i know the better" },
  { title: "Blonde on Blonde", sortKey: "blonde on blonde" },
  { title: "The Velvet Underground & Nico", sortKey: "velvet underground & nico" },
];

describe("album-sort the article", () => {
  it.each(THE_FIXTURE)("sortKeyForTitle(%j)", ({ title, sortKey }) => {
    expect(sortKeyForTitle(title)).toBe(sortKey);
  });

  it("orders The Wall after Abbey Road", () => {
    expect(compareAlbumTitles("Abbey Road", "The Wall")).toBeLessThan(0);
  });

  it("does not strip leading An", () => {
    expect(sortKeyForTitle("An Innocent Man").startsWith("an ")).toBe(true);
  });
});
