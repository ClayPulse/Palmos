import { ModelConfig } from "@/lib/types";
import { BaseImageGen } from "./base-image-gen";
import { ReplicateImageGen } from "./models/replicate-image-gen";

export function getImageGenModel(
  modelConfig: ModelConfig,
): BaseImageGen | undefined {
  const { provider, apiKey, modelName } = modelConfig;

  if (!apiKey) {
    throw new Error(`${provider} API key is required`);
  }

  switch (provider) {
    case "replicate":
      return new ReplicateImageGen(apiKey, modelName);
    default:
      return undefined;
  }
}
