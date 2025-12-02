import { ChatOpenAI } from "@langchain/openai";
import { BaseLLM } from "../base-llm";

export class OpenAILLM_GPT extends BaseLLM {
  private model: ChatOpenAI;

  constructor(apiKey: string, modelName: string, temperature?: number) {
    super();

    const model = new ChatOpenAI({
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
