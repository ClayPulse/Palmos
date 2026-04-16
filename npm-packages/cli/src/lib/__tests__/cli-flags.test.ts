import { describe, it, expect } from "vitest";
import { flags } from "../cli-flags.js";

describe("flags", () => {
  it("should define all expected flags", () => {
    expect(flags.token).toBeDefined();
    expect(flags.flow).toBeDefined();
    expect(flags.framework).toBeDefined();
    expect(flags.stage).toBeDefined();
    expect(flags.stageServer).toBeDefined();
    expect(flags.name).toBeDefined();
    expect(flags.visibility).toBeDefined();
    expect(flags.target).toBeDefined();
    expect(flags.beta).toBeDefined();
    expect(flags.build).toBeDefined();
    expect(flags.path).toBeDefined();
    expect(flags.displayName).toBeDefined();
    expect(flags.description).toBeDefined();
    expect(flags.continue).toBeDefined();
  });

  it("should have correct types", () => {
    expect(flags.token.type).toBe("boolean");
    expect(flags.framework.type).toBe("string");
    expect(flags.stage.type).toBe("boolean");
    expect(flags.name.type).toBe("string");
  });

  it("should have correct defaults", () => {
    expect((flags.stage as any).default).toBe(false);
    expect((flags.build as any).default).toBe(true);
    expect((flags.continue as any).default).toBe(false);
  });

  it("should have correct short flags", () => {
    expect((flags.framework as any).shortFlag).toBe("f");
    expect((flags.name as any).shortFlag).toBe("n");
    expect((flags.visibility as any).shortFlag).toBe("v");
    expect((flags.target as any).shortFlag).toBe("t");
    expect((flags.path as any).shortFlag).toBe("p");
    expect((flags.description as any).shortFlag).toBe("d");
  });
});
