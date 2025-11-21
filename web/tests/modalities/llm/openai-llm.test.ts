import { describe, expect, jest, test } from "@jest/globals";
import dotenv from "dotenv";
import { getLLMModel } from "../../../lib/modalities/llm/get-llm";
import { ModelConfig } from "../../../lib/types";

dotenv.config();

describe("OpenAILLM_GPT.generateStream (REAL OpenAI API)", () => {
  // streaming can take a few seconds
  jest.setTimeout(20000);

  test("streams real model output from OpenAI", async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY env var");

    const llm = getLLMModel({
      apiKey,
      provider: "openai",
      modelName: "gpt-4o-mini",
      temperature: 0.95,
    } as ModelConfig);

    if (!llm) throw new Error("Failed to create OpenAILLM_GPT instance");

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
