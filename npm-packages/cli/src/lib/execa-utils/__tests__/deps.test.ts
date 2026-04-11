import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDepsBinPath } from "../deps.js";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

vi.mock("../../resolve-cli-root.js", () => ({
  CLI_ROOT: "/fake/node_modules/@pulse-editor/cli",
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

  it("should return cli node_modules/.bin path when found there", () => {
    // First call: project node_modules/rimraf — not found
    // Second call: CLI_ROOT/node_modules/.bin/rimraf — found
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(false)  // project node_modules check
      .mockReturnValueOnce(true);  // CLI_ROOT/node_modules/.bin check
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });

    const result = getDepsBinPath("rimraf");
    expect(result).toContain("node_modules");
    expect(result).toContain(".bin");
    expect(result).toMatch(/rimraf$/);
    expect(result).not.toContain(".cmd");

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should fallback to npx when dependency not found anywhere", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getDepsBinPath("nonexistent")).toBe("npx nonexistent");
  });
});
