import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDepsBinPath } from "../deps.js";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

import fs from "fs";

describe("getDepsBinPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return npx when package exists in local node_modules", () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(true);
    expect(getDepsBinPath("rimraf")).toBe("npx rimraf");
  });

  it("should return full path with .cmd on Windows", () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false).mockReturnValueOnce(true);
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });

    const result = getDepsBinPath("rimraf");
    expect(result).toContain("rimraf.cmd");
    expect(result).toContain("@pulse-editor/cli/node_modules/.bin/");

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should return full path without .cmd on non-Windows", () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false).mockReturnValueOnce(true);
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });

    const result = getDepsBinPath("rimraf");
    expect(result).toContain("@pulse-editor/cli/node_modules/.bin/rimraf");
    expect(result).not.toContain(".cmd");

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should throw when dependency not found", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(() => getDepsBinPath("nonexistent")).toThrow(
      "Dependency nonexistent not found."
    );
  });
});
