import { describe, it, expect } from "vitest";
import { getBackendUrl } from "../backend-url.js";

describe("getBackendUrl", () => {
  it("should return localhost URL when stage is true", () => {
    expect(getBackendUrl(true)).toBe("https://localhost:8080");
  });

  it("should return production URL when stage is false", () => {
    expect(getBackendUrl(false)).toBe("https://pulse-editor.com");
  });
});
