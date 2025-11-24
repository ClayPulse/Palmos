import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

import { UserMessage } from "../../../lib/types";
const { decode } = await import("@toon-format/toon");
const { chatWithAssistant } = await import(
  "../../../lib/platform-assistant/assistant"
);
const fs = await import("fs");
const { llmProviderOptions } = await import(
  "../../../lib/modalities/llm/options"
);

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) throw new Error("Missing OPENAI_API_KEY env var");

const llmConfig = {
  provider: llmProviderOptions["openai"].provider,
  modelName: "gpt-4o",
  temperature: 1,
  apiKey: openaiApiKey,
};

describe("Platform Assistant Test", () => {
  jest.setTimeout(20000);

  test("Test llm", async () => {
    const input: UserMessage = {
      message: {
        text: 'Do not call any app action, simply repeat this in your response: "Hello, Editor Agent!"',
        audio: undefined,
      },
      attachments: [],
    };

    const result = await chatWithAssistant(
      input,
      {
        isOutputAudio: false,
      },
      llmConfig,
      {},
      {
        chatHistory: [],
        activeTabView: "",
        availableCommands: [],
        projectDirTree: [],
      },
    );

    const textOutput = result.message.text;

    const outputJson = decode(textOutput ?? "") as {
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
