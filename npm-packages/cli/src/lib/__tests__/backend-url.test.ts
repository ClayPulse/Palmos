import { describe, it, expect } from "vitest";
import { getBackendUrl } from "../backend-url.js";

describe("getBackendUrl", () => {
  it("should return localhost URL when stage is true", () => {
    expect(getBackendUrl(true)).toBe("https://localhost:8080");
  });

  it("should return production URL when stage is false", () => {
    expect(getBackendUrl(false)).toBe("https://palmos.ai");
  });

  it("should return custom stage server URL when stage is true and stageServer is provided", () => {
    expect(getBackendUrl(true, "https://staging.example.com")).toBe(
      "https://staging.example.com",
    );
  });

  it("should ignore stageServer when stage is false", () => {
    expect(getBackendUrl(false, "https://staging.example.com")).toBe(
      "https://palmos.ai",
    );
  });

  it("should fall back to default stage URL when stageServer is empty", () => {
    expect(getBackendUrl(true, "")).toBe("https://localhost:8080");
  });
});
