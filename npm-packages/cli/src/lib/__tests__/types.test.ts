import { describe, it, expect } from "vitest";

// types.ts only exports a type, which doesn't generate runtime code.
// Import something from the file to register it for coverage.
describe("types", () => {
  it("should export Item type (compile-time only)", async () => {
    // This is a type-only file, importing it registers coverage
    const mod = await import("../types.js");
    expect(mod).toBeDefined();
  });
});
