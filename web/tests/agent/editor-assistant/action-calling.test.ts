import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

import { UserMessage } from "../../../lib/types";
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

  test("Test app action calling", async () => {
    const input: UserMessage = {
      content: {
        text: "Repeat: Hello, Editor Agent!",
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
        availableCommands: [
          {
            cmdName: "echo",
            parameters: [
              {
                name: "output",
                type: "string",
                description: "The output string to echo back.",
              },
            ],
          },
        ],
        projectDirTree: [],
      },
    );

    const textOutput = result.content.text;

    const outputJson = JSON.parse(textOutput ?? "") as {
      response: string;
      language: string;
      suggestedCmd: string;
      suggestedArgs: {
        name: string;
        value: string;
      }[];
    };

    // Test against cmd usage
    expect(outputJson.suggestedCmd).toEqual("echo");
    expect(outputJson.suggestedArgs[0].name).toEqual("output");
    expect(outputJson.suggestedArgs[0].value).toEqual("Hello, Editor Agent!");
  });
});
