import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishApp } from "../publish-app.js";

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(),
  },
}));

vi.mock("../../token.js", () => ({
  getToken: vi.fn(() => "test-token"),
}));

vi.mock("../../backend-url.js", () => ({
  getBackendUrl: vi.fn((stage: boolean) =>
    stage ? "https://localhost:8080" : "https://palmos.ai"
  ),
}));

import fs from "fs";

describe("publishApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 });
  });

  it("should read config and zip, then POST to publish endpoint", async () => {
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('{"visibility": "public"}' as any)
      .mockReturnValueOnce(Buffer.from("fake-zip") as any);

    const res = await publishApp(false);

    expect(fetch).toHaveBeenCalledWith(
      "https://palmos.ai/api/app/publish",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("should use stage URL when isStage is true", async () => {
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('{"visibility": "private"}' as any)
      .mockReturnValueOnce(Buffer.from("fake-zip") as any);

    await publishApp(true);

    expect(fetch).toHaveBeenCalledWith(
      "https://localhost:8080/api/app/publish",
      expect.any(Object)
    );
  });
});
