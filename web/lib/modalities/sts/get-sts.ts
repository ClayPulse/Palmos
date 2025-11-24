import { ModelConfig } from "@/lib/types";
import { BaseSTS } from "./base-sts";
import { OpenAISTS } from "./models/openai-sts";
import { PulseEditorSTS } from "./models/pulse-editor-sts";

export function getSTSModel(modelConfig: ModelConfig): BaseSTS | undefined {
  const { provider, apiKey, modelName } = modelConfig;

  switch (provider) {
    case "openai":
      if (!apiKey) {
        throw new Error("OpenAI API key is required");
      }
      return new OpenAISTS(apiKey, modelName);
    case "pulse-editor":
      return new PulseEditorSTS(modelName);
    default:
      return undefined;
  }
}
