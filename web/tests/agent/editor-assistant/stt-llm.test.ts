import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

import { getTTSModel } from "../../../lib/modalities/tts/tts";
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

  test("Test stt-llm", async () => {
    // Generate audio
    const tts = getTTSModel(openaiApiKey, "openai", "tts-1");

    const ttsAudio = await tts.generateStream(
      'Do not call any app action, simply repeat this in your response: "Hello, Editor Agent!"',
    );

    const ttsArrayBuffer = await ttsAudio.arrayBuffer();

    // save the audio to file for manual verification
    if (!fs.existsSync("tests/artifacts")) {
      fs.mkdirSync("tests/artifacts");
    }
    fs.writeFileSync(
      "tests/artifacts/assistant_input.mp3",
      Buffer.from(ttsArrayBuffer),
    );

    // Send audio to assistant
    const input: UserMessage = {
      message: {
        text: undefined,
        audio: ttsArrayBuffer,
      },
      attachments: [],
    };

    const result = await chatWithAssistant(
      input,
      {
        isOutputAudio: false,
      },
      llmConfig,
      {
        stt: {
          provider: "openai",
          modelName: "gpt-4o-mini-transcribe",
          apiKey: openaiApiKey,
        },
      },
      {
        chatHistory: [],
        activeTabView: "",
        availableCommands: [],
        projectDirTree: [],
      },
    );

    const textOutputJson = decode(result.message.text ?? "") as {
      response: string;
      language: string;
      suggestedCmd: string;
      suggestedArgs: {
        name: string;
        value: string;
      }[];
    };

    expect(
      textOutputJson.response
        // trim whitespace
        .trim()
        // use lower case
        .toLowerCase()
        // remove all punctuation
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""),
    ).toBe("hello editor agent");
  });
});
