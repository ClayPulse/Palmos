import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWebpackConfig } from "../webpack-config.js";

vi.mock("../configs/mf-client.js", () => ({
  makeMFClientConfig: vi.fn().mockResolvedValue({ name: "client-config" }),
}));

vi.mock("../configs/mf-server.js", () => ({
  makeMFServerConfig: vi.fn().mockResolvedValue({ name: "server-config" }),
}));

vi.mock("../configs/preview.js", () => ({
  makePreviewClientConfig: vi
    .fn()
    .mockResolvedValue({ name: "preview-config" }),
}));

import { makeMFClientConfig } from "../configs/mf-client.js";
import { makeMFServerConfig } from "../configs/mf-server.js";
import { makePreviewClientConfig } from "../configs/preview.js";

describe("createWebpackConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return preview + server configs when isPreview", async () => {
    const result = await createWebpackConfig(true, "both", "development");
    expect(result).toHaveLength(2);
    expect(makePreviewClientConfig).toHaveBeenCalledWith("development");
    expect(makeMFServerConfig).toHaveBeenCalledWith("development");
  });

  it("should return only server config when buildTarget is server", async () => {
    const result = await createWebpackConfig(false, "server", "production");
    expect(result).toHaveLength(1);
    expect(makeMFServerConfig).toHaveBeenCalledWith("production");
    expect(makeMFClientConfig).not.toHaveBeenCalled();
  });

  it("should return only client config when buildTarget is client", async () => {
    const result = await createWebpackConfig(false, "client", "production");
    expect(result).toHaveLength(1);
    expect(makeMFClientConfig).toHaveBeenCalledWith("production");
    expect(makeMFServerConfig).not.toHaveBeenCalled();
  });

  it("should return both configs when buildTarget is both", async () => {
    const result = await createWebpackConfig(false, "both", "development");
    expect(result).toHaveLength(2);
    expect(makeMFClientConfig).toHaveBeenCalledWith("development");
    expect(makeMFServerConfig).toHaveBeenCalledWith("development");
  });
});
