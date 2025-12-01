import { STTModelConfig } from "@pulse-editor/shared-utils";
import { BaseSTT } from "./base-stt";
import { OenAISTT_Whisper } from "./models/openai-stt";
import { PulseEditorSTT } from "./models/pulse-editor-stt";

export function getSTTModel(modelConfig: STTModelConfig): BaseSTT {
  const [provider, modelName] = modelConfig.modelId.split("/");

  switch (provider) {
    case "openai":
      if (!modelConfig.apiKey) {
        throw new Error("OpenAI API key is required for STT model.");
      }
      return new OenAISTT_Whisper(modelConfig.apiKey, modelName);

    case "pulse-editor":
      return new PulseEditorSTT(modelName);

    default:
      throw new Error(`Unsupported STT provider: ${provider}`);
  }
}
