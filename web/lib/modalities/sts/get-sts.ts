import { STSModelConfig } from "@pulse-editor/shared-utils";
import { BaseSTS } from "./base-sts";
import { OpenAISTS } from "./models/openai-sts";
import { PulseEditorSTS } from "./models/pulse-editor-sts";

export function getSTSModel(modelConfig: STSModelConfig): BaseSTS | undefined {
  const [provider, modelName] = modelConfig.modelId.split("/");

  switch (provider) {
    case "openai":
      if (!modelConfig.apiKey) {
        throw new Error("OpenAI API key is required");
      }
      return new OpenAISTS(modelConfig.apiKey, modelName);
    case "pulse-editor":
      return new PulseEditorSTS(modelName);
    default:
      return undefined;
  }
}
