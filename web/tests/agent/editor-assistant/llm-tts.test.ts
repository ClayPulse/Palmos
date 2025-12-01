import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

import { UserMessage } from "../../../lib/types";
const { getSTTModel } = await import("../../../lib/modalities/stt/get-stt");
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

  test("Test llm-tts", async () => {
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
        isOutputAudio: true,
      },
      {
        llm: llmConfig,
        tts: {
          modelId: "openai/tts-1",
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
    const audioOutput = result.content.audio;
    expect(audioOutput).toBeDefined();

    if (!audioOutput) return;

    let audioArrayBuffer: ArrayBuffer = new ArrayBuffer(0);
    const reader1 = audioOutput.getReader();
    while (true) {
      const { done, value } = await reader1.read();
      if (done) break;
      const tmp = new Uint8Array(
        audioArrayBuffer.byteLength + value.byteLength,
      );
      tmp.set(new Uint8Array(audioArrayBuffer), 0);
      tmp.set(new Uint8Array(value), audioArrayBuffer.byteLength);
      audioArrayBuffer = tmp.buffer;
    }

    // Save audio output to file for manual verification
    const blob = new Blob([audioArrayBuffer], { type: "audio/mp3" });
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
      modelId: "openai/gpt-4o-mini-transcribe",
      apiKey: openaiApiKey,
    });

    const transcribed = await stt.generateStream(audioArrayBuffer, "mp3");

    const reader2 = transcribed.getReader();
    let transcribedResult = "";
    while (true) {
      const { done, value } = await reader2.read();
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
