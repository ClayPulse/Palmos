import { fetchAPI } from "@/lib/pulse-editor-website/backend";
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
    const response = await fetchAPI(`/api/inference/pulse-editor-llm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        temperature: this.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `PulseEditorLLM API error: ${response.status} ${response.statusText}`,
      );
    }

    const stream = response.body;
    if (!stream) {
      throw new Error("No stream in response");
    }

    const rStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(new TextDecoder().decode(chunk));
        }
        controller.close();
      },
    });

    return rStream;
  }
}
