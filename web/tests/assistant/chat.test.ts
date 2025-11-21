import { describe, jest } from "@jest/globals";
import { createMockFetchAPI } from "../utils";
createMockFetchAPI();

import { UserMessage } from "../../lib/types";
const { decode } = await import("@toon-format/toon");
const { chatWithAssistant } = await import(
  "../../lib/platform-assistant/assistant"
);
const fs = await import("fs");
const { llmProviderOptions } = await import("../../lib/modalities/llm/options");

const pulseApiKey = process.env.PULSE_EDITOR_API_KEY;
if (!pulseApiKey) throw new Error("Missing PULSE_EDITOR_API_KEY env var");
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) throw new Error("Missing OPENAI_API_KEY env var");

const llmConfig = {
  provider: llmProviderOptions["pulse-editor"].provider,
  modelName: "pulse-ai-llm-v1",
  temperature: 0.9,
  apiKey: pulseApiKey,
};

describe("Platform Assistant Test", () => {
  jest.setTimeout(20000);

  test("Test text-to-text", async () => {
    const input: UserMessage = {
      message: {
        text: "Repeat after me: Hello, Cloud Agent!",
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

    const textOutput = result.message.text;
    console.log("Assistant Output Text:", textOutput);

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
    expect(outputJson.suggestedCmd).toEqual("echo");
    expect(outputJson.suggestedArgs[0].name).toEqual("output");
    expect(outputJson.suggestedArgs[0].value).toEqual("Hello, Cloud Agent!");
  });

  test("Test text-to-audio", async () => {
    const input: UserMessage = {
      message: {
        text: "Repeat after me: Hello, Cloud Agent!",
        audio: undefined,
      },
      attachments: [],
    };

    const result = await chatWithAssistant(
      input,
      {
        isOutputAudio: true,
      },
      llmConfig,
      {
        tts: {
          provider: "openai",
          modelName: "tts-1",
          apiKey: openaiApiKey,
        },
      },
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

    console.log("Assistant Output Text:", result);

    const textOutputJson = decode(result.message.text ?? "") as {
      response: string;
      language: string;
      suggestedCmd: string;
      suggestedArgs: {
        name: string;
        value: string;
      }[];
    };

    // Test against cmd usage
    expect(textOutputJson.suggestedCmd).toEqual("echo");
    expect(textOutputJson.suggestedArgs[0].name).toEqual("output");
    expect(textOutputJson.suggestedArgs[0].value).toEqual(
      "Hello, Cloud Agent!",
    );

    const audioOutput = result.message.audio;
    expect(audioOutput).toBeDefined();

    if (!audioOutput) return;

    // Save audio output to file for manual verification
    const blob = new Blob([audioOutput], { type: "audio/mpeg" });
    const arrayBuffer = await blob.arrayBuffer();

    if (!fs.existsSync("tests/artifacts")) {
      fs.mkdirSync("tests/artifacts");
    }
    fs.writeFileSync(
      "tests/artifacts/assistant_output.mp3",
      Buffer.from(arrayBuffer),
    );
  });
});
