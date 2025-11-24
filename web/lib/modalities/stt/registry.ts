import { AIProviderOption } from "@/lib/types";

export const sttProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [
      "whisper-1",
      "gpt-4o-transcribe",
      "gpt-4o-mini-transcribe",
    ],
  },
};
