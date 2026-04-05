import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanDist } from "../clean.js";

vi.mock("execa", () => ({
  execa: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../deps.js", () => ({
  getDepsBinPath: vi.fn(() => "npx rimraf"),
}));

import { execa } from "execa";

describe("cleanDist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should call execa with rimraf dist", async () => {
    await cleanDist();
    expect(execa).toHaveBeenCalledWith("npx rimraf dist", { shell: true });
  });

  it("should log cleaning messages", async () => {
    await cleanDist();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Cleaning dist")
    );
  });
});
