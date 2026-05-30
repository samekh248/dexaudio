import { describe, expect, it } from "vitest";
import { isSeekRequest, rangeStartByte } from "../../src/api/routes/stream.js";

describe("stream range guard", () => {
  it("treats a missing Range as a full-body (200) request", () => {
    expect(rangeStartByte(undefined)).toBe(0);
  });

  it("treats a whole-file Range (bytes=0-) as a full-body request", () => {
    // Browsers send this on initial media load; forwarding it caused premature
    // end-of-track on transcoded Plex streams.
    expect(rangeStartByte("bytes=0-")).toBe(0);
    expect(rangeStartByte("  bytes=0-  ")).toBe(0);
  });

  it("reports the start byte for a genuine seek so the Range is forwarded", () => {
    expect(rangeStartByte("bytes=1048576-")).toBe(1048576);
    expect(rangeStartByte("bytes=500-999")).toBe(500);
  });

  it("ignores malformed Range headers", () => {
    expect(rangeStartByte("bytes=-500")).toBe(0);
    expect(rangeStartByte("garbage")).toBe(0);
  });
});

describe("isSeekRequest", () => {
  it("treats the initial full load as a non-seek so no Content-Length is echoed", () => {
    // A non-seek must stream to EOF; echoing Plex's estimated Content-Length on
    // a transcode makes the browser stop early and skip to the next track.
    expect(isSeekRequest(undefined)).toBe(false);
    expect(isSeekRequest("bytes=0-")).toBe(false);
  });

  it("treats a non-zero start byte as a genuine seek (206 metadata forwarded)", () => {
    expect(isSeekRequest("bytes=1048576-")).toBe(true);
    expect(isSeekRequest("bytes=500-999")).toBe(true);
  });
});
