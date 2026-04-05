import { describe, it, expect, vi, beforeEach } from "vitest";
import { webpackCompile } from "../compile.js";

vi.mock("webpack", () => {
  const mockCompiler = {
    run: vi.fn((cb: any) => cb(null)),
    watch: vi.fn((_opts: any, cb: any) => cb(null)),
  };
  const webpack = vi.fn(() => mockCompiler);
  return { default: webpack, __mockCompiler: mockCompiler };
});

vi.mock("../configs/utils.js", () => ({
  generateTempTsConfig: vi.fn(),
}));

vi.mock("../webpack-config.js", () => ({
  createWebpackConfig: vi.fn().mockResolvedValue([{ name: "config" }]),
}));

import webpack from "webpack";
import { generateTempTsConfig } from "../configs/utils.js";
import { createWebpackConfig } from "../webpack-config.js";

describe("webpackCompile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call generateTempTsConfig", async () => {
    await webpackCompile("production");
    expect(generateTempTsConfig).toHaveBeenCalled();
  });

  it("should pass correct params for production mode", async () => {
    await webpackCompile("production");
    expect(createWebpackConfig).toHaveBeenCalledWith(false, "both", "production");
  });

  it("should pass correct params for development mode", async () => {
    await webpackCompile("development");
    expect(createWebpackConfig).toHaveBeenCalledWith(false, "both", "development");
  });

  it("should pass correct params for preview mode", async () => {
    await webpackCompile("preview");
    expect(createWebpackConfig).toHaveBeenCalledWith(true, "both", "development");
  });

  it("should pass buildTarget when specified", async () => {
    await webpackCompile("production", "client");
    expect(createWebpackConfig).toHaveBeenCalledWith(false, "client", "production");
  });

  it("should return compiler in watch mode", async () => {
    const result = await webpackCompile("development", undefined, true);
    expect(result).toBeDefined();
    const mockCompiler = (webpack as any)().__proto__; // just verify it returns
  });

  it("should handle webpack run errors", async () => {
    const { __mockCompiler } = await import("webpack") as any;
    __mockCompiler.run.mockImplementationOnce((cb: any) =>
      cb(new Error("build error"))
    );
    await expect(webpackCompile("production")).rejects.toThrow("build error");
  });

  it("should log error when watch mode has errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { __mockCompiler } = await import("webpack") as any;
    __mockCompiler.watch.mockImplementationOnce((_opts: any, cb: any) =>
      cb(new Error("watch error"))
    );
    const result = await webpackCompile("development", undefined, true);
    expect(result).toBeDefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Webpack build failed"),
      expect.any(Error)
    );
  });
});
