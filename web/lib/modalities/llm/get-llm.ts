import { ModelConfig } from "@/lib/types";
import { BaseLLM } from "./base-llm";
import { AnthropicLLM_Claude } from "./models/anthropic-llm";
import { OpenAILLM_GPT } from "./models/openai-llm";
import { PulseEditorLLM } from "./models/pulse-editor-llm";

export function getLLMModel(modelConfig: ModelConfig): BaseLLM | undefined {
  switch (modelConfig.provider) {
    case "openai":
      if (!modelConfig.apiKey) {
        throw new Error("OpenAI API key is required");
      }

      return new OpenAILLM_GPT(
        modelConfig.apiKey,
        modelConfig.modelName,
        modelConfig.temperature,
      );
    case "anthropic":
      if (!modelConfig.apiKey) {
        throw new Error("OpenAI API key is required");
      }

      return new AnthropicLLM_Claude(
        modelConfig.apiKey,
        modelConfig.modelName,
        modelConfig.temperature,
      );
    case "togetherai":
      throw new Error("TogetherAI model not implemented yet");
    case "ollama":
      throw new Error("Local model not implemented yet");
    case "pulse-editor":
      return new PulseEditorLLM(
        modelConfig.apiKey,
        modelConfig.modelName,
        modelConfig.temperature,
      );
    default:
      return undefined;
  }
}
