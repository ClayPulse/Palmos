import { AIProviderOption } from "@/lib/types";

type ProviderName = "openai" | "pulse-editor";

export const sttProviderOptions: {
  [key in ProviderName]: AIProviderOption;
} = {
  openai: {
    provider: "openai",
    isSupported: true,
    models: [
      {
        model: "whisper-1",
        isSupported: true,
      },
      {
        model: "gpt-4o-transcribe",
        isSupported: true,
      },
      {
        model: "gpt-4o-mini-transcribe",
        isSupported: true,
      },
    ],
  },
  "pulse-editor": {
    provider: "pulseEditor",
    isSupported: false,
    models: [
      {
        model: "pulse_stt",
        isSupported: true,
      },
    ],
  },
};
