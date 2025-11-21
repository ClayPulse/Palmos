import { ModelConfig } from "@/lib/types";
import { BaseSTS } from "./base-sts";

export function getSTSModel(modelConfig: ModelConfig): BaseSTS | undefined {
  switch (modelConfig.provider) {
    case "openai":
      throw new Error("OpenAI STS model not implemented yet");
    case "pulse-editor":
      return undefined;
    default:
      return undefined;
  }
}
