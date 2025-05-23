import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { TogetherAI } from "@langchain/community/llms/togetherai";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

export class BaseLLM {
  // The model object
  private model: BaseLanguageModel;
  // A function defines how to generate the output using the model
  private generateFunc?: (
    model: BaseLanguageModel,
    prompt: string,
    signal?: AbortSignal,
  ) => Promise<string>;

  private generateStreamFunc?: (
    model: BaseLanguageModel,
    prompt: string,
    signal?: AbortSignal,
  ) => Promise<ReadableStream<string>>;

  constructor(
    model: BaseLanguageModel,
    generateFunc?: (
      model: BaseLanguageModel,
      prompt: string,
      signal?: AbortSignal,
    ) => Promise<string>,
    generateStreamFunc?: (
      model: BaseLanguageModel,
      prompt: string,
      signal?: AbortSignal,
    ) => Promise<ReadableStream<string>>,
  ) {
    this.model = model;
    this.generateFunc = generateFunc;
    this.generateStreamFunc = generateStreamFunc;
  }

  public async generate(prompt: string, signal?: AbortSignal): Promise<string> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(this.model, prompt, signal);
  }

  public async generateStream(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<string>> {
    if (!this.generateStreamFunc) {
      throw new Error("Generate stream function is not defined.");
    }
    return await this.generateStreamFunc(this.model, prompt, signal);
  }
}

export function getLLMModel(
  apiKey: string,
  provider: string,
  modelName: string,
  temperature: number,
): BaseLLM {
  let model: BaseLanguageModel;
  switch (provider) {
    case "openai":
      model = new ChatOpenAI({
        apiKey,
        model: modelName,
        temperature,
      });
      break;
    case "anthropic":
      model = new ChatAnthropic({
        apiKey,
        model: modelName,
        temperature,
      });

      break;
    case "togetherai":
      model = new TogetherAI({
        apiKey,
        model: modelName,
        temperature,
      });
      break;
    case "local":
      throw new Error("Local model not implemented yet");
    default:
      model = new ChatOpenAI({
        apiKey,
        model: modelName,
        temperature,
      });
  }

  async function generateFunc(
    model: BaseLanguageModel,
    prompt: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const result = await model.invoke(prompt, {
      signal,
    });
    return result.content;
  }

  async function generateStreamFunc(
    model: BaseLanguageModel,
    prompt: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<string>> {
    const stream = await model.stream(prompt, {
      signal,
    });

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

  return new BaseLLM(model, generateFunc, generateStreamFunc);
}
