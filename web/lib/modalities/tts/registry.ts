import { AIProviderOption } from "@/lib/types";

export const ttsProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [
      "tts-1",
      "tts-1-hd",
      "gpt-4o-mini-tts",
    ],
  },
  elevenlabs: {
    models: [
      "eleven_multilingual_v2",
      "eleven_turbo_v2_5",
    ],
  },
  playht: {
    models: [
      "Play3.0-mini",
    ],
  },
};
