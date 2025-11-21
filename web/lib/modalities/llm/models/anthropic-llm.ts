import { ChatAnthropic } from "@langchain/anthropic";
import { BaseLLM } from "../base-llm";

export class AnthropicLLM_Claude extends BaseLLM {
  private model: ChatAnthropic;

  constructor(apiKey: string, modelName: string, temperature?: number) {
    super();

    const model = new ChatAnthropic({
      apiKey,
      model: modelName,
      temperature,
    });

    this.model = model;
  }

  public async generateStream(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<string>> {
    const stream = await this.model.stream(prompt);
    const rStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(chunk.content);
        }
        controller.close();
      },
    });

    return rStream;
  }
}
