import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

import { getSTTModel } from "../../../lib/modalities/stt/get-stt";
import { UserMessage } from "../../../lib/types";
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

  test("Test llm-tts", async () => {
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
        availableCommands: [],
        projectDirTree: [],
      },
    );

    // Test against cmd usage
    const audioOutput = result.message.audio;
    expect(audioOutput).toBeDefined();

    if (!audioOutput) return;

    // Save audio output to file for manual verification
    const blob = new Blob([audioOutput], { type: "audio/mp3" });
    const arrayBuffer = await blob.arrayBuffer();

    if (!fs.existsSync("tests/artifacts")) {
      fs.mkdirSync("tests/artifacts");
    }
    fs.writeFileSync(
      "tests/artifacts/assistant_output.mp3",
      Buffer.from(arrayBuffer),
    );

    // Send audio output to STT for verification
    const stt = getSTTModel({
      provider: "openai",
      modelName: "gpt-4o-mini-transcribe",
      apiKey: openaiApiKey,
    });

    const transcribed = await stt.generateStream(audioOutput);

    const reader = transcribed.getReader();
    let transcribedResult = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      transcribedResult += value;
    }

    expect(
      transcribedResult
        // trim whitespace
        .trim()
        // use lower case
        .toLowerCase()
        // remove all punctuation
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""),
    ).toEqual("hello editor agent");
  });
});
