import { describe, expect, it } from "vitest";
import { AppError, NotFoundError, ValidationError } from "../../src/lib/errors.js";

describe("errors", () => {
  it("maps to error body", () => {
    const err = new ValidationError("bad", "fix it");
    expect(err.statusCode).toBe(400);
    expect(err.toBody().action).toBe("fix it");
  });

  it("not found has 404", () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it("app error custom status", () => {
    expect(new AppError("x", 503).statusCode).toBe(503);
  });
});
