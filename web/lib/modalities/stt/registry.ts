import { AIProviderOption } from "@/lib/types";

export const sttProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [
      {
        name: "whisper-1",
        description: "General-purpose speech recognition model",
      },
      {
        name: "gpt-4o-transcribe",
        description: "GPT-4o based transcription with advanced understanding",
      },
      {
        name: "gpt-4o-mini-transcribe",
        description: "Faster GPT-4o mini transcription model",
      },
    ],
  },
};
