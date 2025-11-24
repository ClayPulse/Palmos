import { AudioModelConfig } from "@/lib/types";
import { BaseTTS } from "./base-tts";
import { ElevenLabsTTS } from "./models/elevenlabs-tts";
import { OpenAITTS } from "./models/openai-tts";
import { PlayHTTTS } from "./models/playht-tts";

export function getTTSModel(
  modelConfig: AudioModelConfig,
): BaseTTS | undefined {
  const { provider, apiKey, modelName, voiceName } = modelConfig;

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
