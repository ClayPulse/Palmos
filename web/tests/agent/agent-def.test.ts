import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../utils";
createMockFetchAPI();

import type { Agent } from "@pulse-editor/shared-utils";
const { AccessEnum } = await import("@pulse-editor/shared-utils");
const { decode } = await import("@toon-format/toon");
const { runLLMAgentMethod } = await import("../../lib/agent/llm-agent-runner");

const testAgent: Agent = {
  name: "cloud-agent-test",
  description: "A test agent for cloud",
  systemPrompt: "You are a helpful assistant.",
  version: "1.0.0",
  availableMethods: [
    {
      access: AccessEnum.public,
      name: "test-method",
      prompt: "Echo the input string.",
      parameters: {
        input: {
          type: "string",
          description: "Input string",
        },
      },
      returns: {
        output: {
          type: "string",
          description: "Output string",
        },
      },
    },
  ],
};

const apiKey = process.env.PULSE_EDITOR_API_KEY;
if (!apiKey) throw new Error("Missing PULSE_EDITOR_API_KEY env var");

const llmConfig = {
  modelId: "pulse-editor/pulse-ai-v1-turbo",
  temperature: 1,
  apiKey: apiKey,
};

describe("Test agent definition", () => {
  jest.setTimeout(20000);

  // Add your cloud agent tests here
  test("Test LLM", async () => {
    const result = await runLLMAgentMethod(
      llmConfig,
      testAgent,
      "test-method",
      { input: "Hello, Cloud Agent!" },
      async (allReceived, newReceived) => {},
    );

    expect(decode(result)).toEqual({ output: "Hello, Cloud Agent!" });
  });
});
