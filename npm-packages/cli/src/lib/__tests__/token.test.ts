import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveToken, getToken, isTokenInEnv, checkToken } from "../token.js";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

vi.mock("os", () => ({
  default: {
    homedir: vi.fn(() => "/home/testuser"),
  },
}));

vi.mock("../backend-url.js", () => ({
  getBackendUrl: vi.fn((stage: boolean) =>
    stage ? "https://localhost:8080" : "https://pulse-editor.com"
  ),
}));

import fs from "fs";

describe("saveToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create config dir if it does not exist and save prod token", () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false).mockReturnValueOnce(false);
    vi.mocked(fs.readFileSync).mockReturnValue("{}");

    saveToken("my-token", false);

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("config.json"),
      expect.stringContaining('"accessToken": "my-token"')
    );
  });

  it("should save dev token when devMode is true", () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false).mockReturnValueOnce(true);

    saveToken("dev-token", true);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"devAccessToken": "dev-token"')
    );
  });

  it("should merge with existing config", () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{"existingKey": "value"}');

    saveToken("new-token", false);

    const written = vi.mocked(fs.writeFileSync).mock.calls[0]![1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.existingKey).toBe("value");
    expect(parsed.accessToken).toBe("new-token");
  });
});

describe("getToken", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return env var PE_ACCESS_TOKEN when set", () => {
    process.env["PE_ACCESS_TOKEN"] = "env-token";
    expect(getToken(false)).toBe("env-token");
  });

  it("should return env var PE_DEV_ACCESS_TOKEN when devMode", () => {
    process.env["PE_DEV_ACCESS_TOKEN"] = "dev-env-token";
    expect(getToken(true)).toBe("dev-env-token");
  });

  it("should read from config file when env not set", () => {
    delete process.env["PE_ACCESS_TOKEN"];
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{"accessToken": "file-token"}');

    expect(getToken(false)).toBe("file-token");
  });

  it("should return undefined when no env and no file", () => {
    delete process.env["PE_ACCESS_TOKEN"];
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getToken(false)).toBeUndefined();
  });

  it("should handle malformed JSON gracefully", () => {
    delete process.env["PE_ACCESS_TOKEN"];
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("not json");

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(getToken(false)).toBeUndefined();
  });

  it("should return devAccessToken in dev mode from file", () => {
    delete process.env["PE_DEV_ACCESS_TOKEN"];
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      '{"devAccessToken": "dev-file-token"}'
    );
    expect(getToken(true)).toBe("dev-file-token");
  });
});

describe("isTokenInEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return true when PE_ACCESS_TOKEN is set", () => {
    process.env["PE_ACCESS_TOKEN"] = "token";
    expect(isTokenInEnv(false)).toBe(true);
  });

  it("should return false when PE_ACCESS_TOKEN is not set", () => {
    delete process.env["PE_ACCESS_TOKEN"];
    expect(isTokenInEnv(false)).toBe(false);
  });

  it("should check PE_DEV_ACCESS_TOKEN in dev mode", () => {
    process.env["PE_DEV_ACCESS_TOKEN"] = "dev-token";
    expect(isTokenInEnv(true)).toBe(true);
  });
});

describe("checkToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true on 200 status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 });
    const result = await checkToken("valid-token", false);
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://pulse-editor.com/api/api-keys/check",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
      })
    );
  });

  it("should return false on non-200 status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 401 });
    const result = await checkToken("bad-token", false);
    expect(result).toBe(false);
  });

  it("should use stage URL in dev mode", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await checkToken("token", true);
    expect(fetch).toHaveBeenCalledWith(
      "https://localhost:8080/api/api-keys/check",
      expect.any(Object)
    );
  });
});
