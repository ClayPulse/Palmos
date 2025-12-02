import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

import { UserMessage } from "../../../lib/types";
const { parseToonToJSON } = await import("../../../lib/agent/toon-parser");
const { Assistant } = await import("../../../lib/editor-assistant/assistant");

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) throw new Error("Missing OPENAI_API_KEY env var");

const llmConfig = {
  modelId: "openai/gpt-4o",
  temperature: 1,
  apiKey: openaiApiKey,
};

describe("Platform Assistant Test", () => {
  jest.setTimeout(20000);

  test("Test llm", async () => {
    const input: UserMessage = {
      content: {
        text: 'Do not call any app action, simply repeat this in your response: "Hello, Editor Agent!"',
        audio: undefined,
      },
      attachments: [],
    };

    const assistant = new Assistant();

    const result = await assistant.chat(
      input,
      {
        isOutputAudio: false,
      },
      {
        llm: llmConfig,
      },
      "useAppActions",
      {
        chatHistory: [],
        activeTabView: "",
        availableCommands: [],
        projectDirTree: [],
      },
    );

    const textOutput = result.content.text;

    const outputJson = parseToonToJSON(textOutput ?? "") as {
      response: string;
      language: string;
      suggestedCmd: string;
      suggestedArgs: {
        name: string;
        value: string;
      }[];
    };

    // Test against cmd usage
    expect(outputJson.response).toBe("Hello, Editor Agent!");
  });
});
