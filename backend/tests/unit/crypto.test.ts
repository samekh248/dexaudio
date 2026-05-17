import { describe, expect, it } from "vitest";
import { decrypt, encrypt, maskSecret } from "../../src/lib/crypto.js";

const SECRET = "a".repeat(32);

describe("crypto", () => {
  it("encrypts and decrypts round trip", () => {
    const plain = "plex-token-12345";
    const blob = encrypt(plain, SECRET);
    expect(decrypt(blob, SECRET)).toBe(plain);
  });

  it("masks secrets", () => {
    expect(maskSecret("abcd")).toBe("****");
    expect(maskSecret("1234567890")).toContain("7890");
  });
});
