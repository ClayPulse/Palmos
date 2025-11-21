import { ModelConfig } from "@/lib/types";
import { BaseSTT } from "./base-stt";
import { OenAISTT_Whisper } from "./models/openai-stt";
import { PulseEditorSTT } from "./models/pulse-editor-stt";

export function getSTTModel(modelConfig: ModelConfig): BaseSTT {
  switch (modelConfig.provider) {
    case "openai":
      if (!modelConfig.apiKey) {
        throw new Error("OpenAI API key is required for STT model.");
      }
      return new OenAISTT_Whisper(modelConfig.apiKey, modelConfig.modelName);

    case "pulse-editor":
      return new PulseEditorSTT(modelConfig.modelName);

    default:
      throw new Error(`Unsupported STT provider: ${modelConfig.provider}`);
  }
}
