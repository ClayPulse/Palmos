import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { parseNDJSONStream } from "../../stream-chunk-parsers";
import { BaseLLM } from "../base-llm";

export class PulseEditorLLM extends BaseLLM {
  private apiKey: string | undefined;
  private modelName: string;
  private temperature: number | undefined;

  constructor(
    apiKey: string | undefined,
    modelName: string,
    temperature?: number,
  ) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.temperature = temperature;
  }

  public async generateStream(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<string>> {
    const response = await fetchAPI(`/api/inference/pulse-editor/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        prompt: {
          text: prompt,
        },
        temperature: this.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`PulseEditorLLM API error: ${await response.text()}`);
    }

    const stream = response.body;
    if (!stream) {
      throw new Error("No stream in response");
    }

    // ReadableStream cannot pass JSON objects via HTTP request, so we convert them back to object here
    const stringStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }).pipeThrough(new TextDecoderStream());

    const finalStream = new ReadableStream({
      async start(controller) {
        await parseNDJSONStream(stringStream, async (data) => {
          const { text }: { text?: string } = data;
          if (text) {
            controller.enqueue(text);
          }
        });

        controller.close();
      },
    });

    return finalStream;
  }
}
