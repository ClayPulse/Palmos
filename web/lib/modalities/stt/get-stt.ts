import { BaseSTT } from "./base-stt";
import { OenAISTT_Whisper } from "./models/openai-stt";
import { PulseEditorSTT } from "./models/pulse-editor-stt";

export function getSTTModel(
  provider: string,
  modelName: string,
  apiKey?: string,
): BaseSTT {
  switch (provider) {
    case "openai":
      return new OenAISTT_Whisper(modelName, apiKey);

    case "pulse-editor":
      return new PulseEditorSTT(modelName);

    default:
      return new OenAISTT_Whisper(modelName, apiKey);
  }
}
