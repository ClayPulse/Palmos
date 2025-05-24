import { AIProviderOption } from "@/lib/types";

type ProviderName = "openai" | "elevenlabs" | "playht";

export const ttsProviderOptions: {
  [key in ProviderName]: AIProviderOption;
} = {
  openai: {
    provider: "openai",
    isSupported: true,
    models: [
      {
        model: "tts-1",
        isSupported: true,
      },
      {
        model: "tts-1-hd",
        isSupported: true,
      },
      {
        model: "gpt-4o-mini-tts",
        isSupported: true,
      },
    ],
  },
  elevenlabs: {
    provider: "elevenlabs",
    isSupported: true,
    models: [
      {
        model: "eleven_multilingual_v2",
        isSupported: true,
      },
      {
        model: "eleven_turbo_v2_5",
        isSupported: true,
      },
    ],
  },
  playht: {
    provider: "playht",
    isSupported: true,
    models: [
      {
        model: "Play3.0-mini",
        isSupported: false,
      },
    ],
  },
};
