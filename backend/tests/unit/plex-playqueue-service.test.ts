import { describe, expect, it } from "vitest";
import { buildPlayQueueCreateUrl } from "../../src/services/plex/plex-playqueue-service.js";

describe("plex-playqueue-service", () => {
  it("builds play queue create URL with track URIs", () => {
    const url = buildPlayQueueCreateUrl("http://plex.local:32400/", ["1", "2"], "machine-abc");
    expect(url).toContain("/playQueues?");
    expect(url).toContain("type=audio");
    expect(url).toContain("metadata%2F1");
    expect(url).toContain("metadata%2F2");
  });
});
