import { describe, expect, jest } from "@jest/globals";
import { ModelConfig } from "../../../lib/types";
import { createMockFetchAPI } from "../../utils";
createMockFetchAPI();

// Use async import for other ESM modules so that mock ESM modules are applied correctly
const { getLLMModel } = await import("../../../lib/modalities/llm/get-llm");

describe("Pulse Editor LLM Models", () => {
  // streaming can take a few seconds
  jest.setTimeout(20000);

  test("streams model output", async () => {
    const apiKey = process.env.PULSE_EDITOR_API_KEY;
    if (!apiKey) throw new Error("Missing PULSE_EDITOR_API_KEY env var");

    const llm = getLLMModel({
      apiKey,
      provider: "pulse-editor",
      modelName: "pulse-ai-v1-turbo",
      temperature: 1,
    } as ModelConfig);

    if (!llm) throw new Error("Failed to create Pulse Editor LLM instance");

    const stream = await llm.generateStream(
      "Repeat after me: The quick brown fox jumps over the lazy dog.",
      undefined,
    );

    expect(stream).toBeInstanceOf(ReadableStream);

    const reader = stream.getReader();
    const chunks: string[] = [];

    let read;
    while (!(read = await reader.read()).done) {
      const v = read.value;
      expect(typeof v).toBe("string");
      chunks.push(v);
    }

    // Ensure we got actual content
    expect(chunks.join("")).toMatch(
      /The quick brown fox jumps over the lazy dog./,
    );
  });
});
