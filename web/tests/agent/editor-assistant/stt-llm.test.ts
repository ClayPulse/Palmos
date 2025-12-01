import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

import { getTTSModel } from "../../../lib/modalities/tts/get-tts";
import { UserMessage } from "../../../lib/types";
const { decode } = await import("@toon-format/toon");
const { Assistant } = await import("../../../lib/editor-assistant/assistant");
const fs = await import("fs");

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) throw new Error("Missing OPENAI_API_KEY env var");

const llmConfig = {
  modelId: "openai/gpt-4o",
  temperature: 1,
  apiKey: openaiApiKey,
};

describe("Platform Assistant Test", () => {
  jest.setTimeout(20000);

  test("Test stt-llm", async () => {
    // Generate audio
    const tts = getTTSModel({
      modelId: "openai/tts-1",
      apiKey: openaiApiKey,
    });

    if (!tts) {
      throw new Error("Failed to get TTS model");
    }

    const ttsAudio = await tts.generateStream(
      'Do not call any app action, simply repeat this in your response: "Hello, Editor Agent!"',
    );

    let ttsArrayBuffer: ArrayBuffer = new ArrayBuffer(0);
    const reader = ttsAudio.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const tmp = new Uint8Array(ttsArrayBuffer.byteLength + value.byteLength);
      tmp.set(new Uint8Array(ttsArrayBuffer), 0);
      tmp.set(new Uint8Array(value), ttsArrayBuffer.byteLength);
      ttsArrayBuffer = tmp.buffer;
    }

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
      content: {
        text: undefined,
        audio: ttsArrayBuffer,
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
        stt: {
          modelId: "openai/gpt-4o-mini-transcribe",
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

    const textOutputJson = decode(result.content.text ?? "") as {
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
