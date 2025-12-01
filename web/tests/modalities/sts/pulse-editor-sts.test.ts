import { describe, expect, jest } from "@jest/globals";
import { ModelConfig } from "@pulse-editor/shared-utils";
import WavEncoder from "wav-encoder";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

// Use async import for other ESM modules so that mock ESM modules are applied correctly
const { getSTSModel } = await import("../../../lib/modalities/sts/get-sts");
const { getSTTModel } = await import("../../../lib/modalities/stt/get-stt");
const { getTTSModel } = await import("../../../lib/modalities/tts/get-tts");
const fs = await import("fs");

describe("Pulse Editor LLM Models", () => {
  // streaming can take a few seconds
  jest.setTimeout(40000);

  test("streams model output", async () => {
    const pulse_editor_api_key = process.env.PULSE_EDITOR_API_KEY;
    if (!pulse_editor_api_key)
      throw new Error("Missing PULSE_EDITOR_API_KEY env var");

    const openai_api_key = process.env.OPENAI_API_KEY;
    if (!openai_api_key) throw new Error("Missing OPENAI_API_KEY env var");

    // Generate speech and save to local if not already present
    if (!fs.existsSync("tests/artifacts/pulse_editor_sts_input.wav")) {
      console.log("Cannot find cached TTS audio, generating...");
      const tts = getTTSModel({
        apiKey: openai_api_key,
        modelId: "openai/tts-1",
        voiceName: "alloy",
      } as ModelConfig);

      const speech = await tts?.generateStream(
        "Repeat after me: The quick brown fox jumps over the lazy dog.",
      );

      if (!speech) throw new Error("Failed to create TTS stream");

      let speechArrayBuffer = new ArrayBuffer(0);
      const reader1 = speech.getReader();
      while (true) {
        const { done, value } = await reader1.read();
        if (done) break;
        const tmp = new Uint8Array(
          speechArrayBuffer.byteLength + value.byteLength,
        );
        tmp.set(new Uint8Array(speechArrayBuffer), 0);
        tmp.set(new Uint8Array(value), speechArrayBuffer.byteLength);
        speechArrayBuffer = tmp.buffer;
      }

      // Save the audio to a file
      if (!fs.existsSync("tests/artifacts")) {
        fs.mkdirSync("tests/artifacts", { recursive: true });
      }
      fs.writeFileSync(
        "tests/artifacts/pulse_editor_sts_input.wav",
        Buffer.from(speechArrayBuffer),
      );
    }

    // Read the audio file
    const speechBuffer = fs.readFileSync(
      "tests/artifacts/pulse_editor_sts_input.wav",
    );

    const speechArrayBuffer = speechBuffer.buffer.slice(
      speechBuffer.byteOffset,
      speechBuffer.byteOffset + speechBuffer.byteLength,
    );

    // ----------------------------------------------------------
    // Generate STS stream
    const sts = getSTSModel({
      apiKey: pulse_editor_api_key,
      modelId: "pulse-editor/pulse-ai-v1-turbo",
      temperature: 1,
    } as ModelConfig);

    if (!sts) throw new Error("Failed to create Pulse Editor LLM instance");

    const stream = await sts.generateStream(undefined, speechArrayBuffer);

    expect(stream).toBeInstanceOf(ReadableStream);

    const reader2 = stream.getReader();
    const chunks: {
      text?: string;
      audio?: ArrayBuffer;
    }[] = [];
    while (true) {
      const { done, value } = await reader2.read();
      if (done) break;

      const chunk: {
        text?: string;
        audio?: ArrayBuffer;
      } = {
        text: value.text,
        audio: value.audio,
      };
      chunks.push(chunk);
    }

    // ----------------------------------------------------------
    // Save the audio output to a file for inspection
    const audioChunks: ArrayBuffer[] = [];
    for (const chunk of chunks) {
      if (chunk.audio) {
        audioChunks.push(chunk.audio);
      }
    }

    let finalArrayBuffer = new ArrayBuffer(0);
    for (const audioChunk of audioChunks) {
      const tmp = new Uint8Array(
        finalArrayBuffer.byteLength + audioChunk.byteLength,
      );
      tmp.set(new Uint8Array(finalArrayBuffer), 0);
      tmp.set(new Uint8Array(audioChunk), finalArrayBuffer.byteLength);
      finalArrayBuffer = tmp.buffer;
    }

    const audioData = {
      sampleRate: 24000,
      channelData: [new Float32Array(finalArrayBuffer)],
    };

    const wavArrayBuffer = await WavEncoder.encode(audioData);
    // Save the audio output to a file for inspection
    fs.writeFileSync(
      "tests/artifacts/pulse_editor_sts_output.wav",
      Buffer.from(wavArrayBuffer),
    );

    // Check text response
    expect(
      chunks
        .map((chunk) => chunk.text)
        .join("")
        .trim()
        .toLowerCase()
        .replaceAll(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""),
    ).toMatch(/the quick brown fox jumps over the lazy dog/);

    const stt = getSTTModel({
      apiKey: openai_api_key,
      modelId: "openai/gpt-4o-mini-transcribe",
    });

    const sttStream = await stt?.generateStream(wavArrayBuffer, "wav");
    if (!sttStream) throw new Error("Failed to create STT stream");

    const reader3 = sttStream.getReader();
    let finalTranscription = "";
    while (true) {
      const { done, value } = await reader3.read();
      if (done) break;
      finalTranscription += value;
    }
    expect(
      finalTranscription
        // trim whitespace
        .trim()
        // use lower case
        .toLowerCase()
        // remove all punctuation
        .replaceAll(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""),
    ).toMatch(/the quick brown fox jumps over the lazy dog/);
  });
});
