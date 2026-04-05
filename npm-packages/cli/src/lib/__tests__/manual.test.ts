import { describe, it, expect } from "vitest";
import { commandsManual } from "../manual.js";

describe("commandsManual", () => {
  it("should have all expected commands", () => {
    const expectedCommands = [
      "help",
      "chat",
      "code",
      "login",
      "logout",
      "publish",
      "create",
      "preview",
      "dev",
      "build",
      "start",
      "clean",
      "upgrade",
      "skill",
    ];

    for (const cmd of expectedCommands) {
      expect(commandsManual).toHaveProperty(cmd);
    }
  });

  it("should have non-empty string values", () => {
    for (const [key, value] of Object.entries(commandsManual)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
