import { ModelConfig } from "@/lib/types";
import { BaseMusicGen } from "./base-music-gen";
import { ClayPulseMusicGen } from "./models/claypulse-music-gen";

export function getMusicGenModel(
  modelConfig: ModelConfig,
): BaseMusicGen | undefined {
  const { provider, apiKey, modelName } = modelConfig;

  switch (provider) {
    case "pulse-editor":
      return new ClayPulseMusicGen(apiKey, modelName);
    default:
      return undefined;
  }
}
