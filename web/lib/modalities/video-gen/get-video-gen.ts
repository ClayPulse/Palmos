import { ModelConfig } from "@/lib/types";
import { BaseVideoGen } from "./base-video-gen";
import { ReplicateVideoGen } from "./models/replicate-video-gen";

export function getVideoGenModel(
  modelConfig: ModelConfig,
): BaseVideoGen | undefined {
  const { provider, apiKey, modelName } = modelConfig;

  if (!apiKey) {
    throw new Error(`${provider} API key is required`);
  }

  switch (provider) {
    case "replicate":
      return new ReplicateVideoGen(apiKey, modelName);
    default:
      return undefined;
  }
}
