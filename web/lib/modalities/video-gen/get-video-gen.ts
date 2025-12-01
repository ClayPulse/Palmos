import { VideoModelConfig } from "@pulse-editor/shared-utils";
import { BaseVideoGen } from "./base-video-gen";
import { ReplicateVideoGen } from "./models/replicate-video-gen";

export function getVideoGenModel(
  modelConfig: VideoModelConfig,
): BaseVideoGen | undefined {
  const { apiKey, modelId } = modelConfig;
  const [provider, modelName] = modelId.split("/");

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
