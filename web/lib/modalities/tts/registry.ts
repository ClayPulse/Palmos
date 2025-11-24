import { AIProviderOption } from "@/lib/types";

export const ttsProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [
      {
        name: "tts-1",
        description: "Standard quality text-to-speech model",
      },
      {
        name: "tts-1-hd",
        description: "High-definition text-to-speech with enhanced audio quality",
      },
      {
        name: "gpt-4o-mini-tts",
        description: "GPT-4o mini with text-to-speech capabilities",
      },
    ],
  },
  elevenlabs: {
    models: [
      {
        name: "eleven_multilingual_v2",
        description: "Multilingual voice generation with natural intonation",
      },
      {
        name: "eleven_turbo_v2_5",
        description: "Fast turbo model for low-latency voice synthesis",
      },
    ],
  },
  playht: {
    models: [
      {
        name: "Play3.0-mini",
        description: "Compact PlayHT model for efficient voice generation",
      },
    ],
  },
};
