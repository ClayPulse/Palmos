import { ImageModelConfig } from "@pulse-editor/shared-utils";
import { BaseImageGen } from "./base-image-gen";
import { ReplicateImageGen } from "./models/replicate-image-gen";

export function getImageGenModel(
  modelConfig: ImageModelConfig,
): BaseImageGen | undefined {
  const { apiKey, modelId } = modelConfig;
  const [provider, modelName] = modelId.split("/");

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
