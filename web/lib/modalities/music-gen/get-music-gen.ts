import { ModelConfig } from "@pulse-editor/shared-utils";
import { BaseMusicGen } from "./base-music-gen";
import { ClayPulseMusicGen } from "./models/claypulse-music-gen";

export function getMusicGenModel(
  modelConfig: ModelConfig,
): BaseMusicGen | undefined {
  const { apiKey, modelId } = modelConfig;
  const [provider, modelName] = modelId.split("/");

  switch (provider) {
    case "pulse-editor":
      return new ClayPulseMusicGen(apiKey, modelName);
    default:
      return undefined;
  }
}
