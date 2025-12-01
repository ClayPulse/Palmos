import { TTSModelConfig } from "@pulse-editor/shared-utils";
import { BaseTTS } from "./base-tts";
import { ElevenLabsTTS } from "./models/elevenlabs-tts";
import { OpenAITTS } from "./models/openai-tts";
import { PlayHTTTS } from "./models/playht-tts";

export function getTTSModel(
  modelConfig: TTSModelConfig,
): BaseTTS | undefined {
  const { apiKey, modelId, voiceName } = modelConfig;
  const [provider, modelName] = modelId.split("/");

  if (!apiKey) {
    throw new Error(`${provider} API key is required`);
  }

  switch (provider) {
    case "openai":
      return new OpenAITTS(apiKey, modelName, voiceName);
    case "elevenlabs":
      return new ElevenLabsTTS(apiKey, modelName, voiceName);
    case "playht":
      return new PlayHTTTS(apiKey, modelName, voiceName);
    default:
      return undefined;
  }
}
