import { describe, expect, jest } from "@jest/globals";
import { createMockFetchAPI } from "../utils";
createMockFetchAPI();

import { getSTTModel } from "../../lib/modalities/stt/get-stt";
import { getTTSModel } from "../../lib/modalities/tts/tts";
import { UserMessage } from "../../lib/types";
const { decode } = await import("@toon-format/toon");
const { chatWithAssistant } = await import(
  "../../lib/platform-assistant/assistant"
);
const fs = await import("fs");
const { llmProviderOptions } = await import("../../lib/modalities/llm/options");

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) throw new Error("Missing OPENAI_API_KEY env var");

const llmConfig = {
  provider: llmProviderOptions["openai"].provider,
  modelName: "gpt-4o",
  temperature: 0.95,
  apiKey: openaiApiKey,
};

describe("Platform Assistant Test", () => {
  jest.setTimeout(20000);

  test("Test app action calling", async () => {
    const input: UserMessage = {
      message: {
        text: "Repeat: Hello, Editor Agent!",
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
    expect(outputJson.suggestedArgs[0].value).toEqual("Hello, Editor Agent!");
  });

  test("Test text-to-text", async () => {
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

  test("Test text-to-speech", async () => {
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

  test("Test speech-to-text", async () => {
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
