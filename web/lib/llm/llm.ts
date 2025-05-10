import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { TogetherAI } from "@langchain/community/llms/togetherai";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

export class BaseLLM {
  // The model object
  private model: BaseLanguageModel;
  // A function defines how to generate the output using the model
  private generateFunc: (
    model: BaseLanguageModel,
    prompt: string,
    signal?: AbortSignal,
  ) => Promise<string>;

  constructor(
    model: BaseLanguageModel,
    generateFunc: (
      model: BaseLanguageModel,
      prompt: string,
      signal?: AbortSignal,
    ) => Promise<string>,
  ) {
    this.model = model;
    this.generateFunc = generateFunc;
  }

  public async generate(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<string> {
    return await this.generateFunc(this.model, prompt, signal);
  }
}

export function getModelLLM(
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

  const generateFunc: (
    model: BaseLanguageModel,
    prompt: string,
    signal?: AbortSignal,
  ) => Promise<string> = async (
    model: BaseLanguageModel,
    prompt: string,
    signal?: AbortSignal,
  ) => {
    const result = await model.invoke(prompt, {
      signal,
    });
    return result.content;
  };

  return new BaseLLM(model, generateFunc);
}
