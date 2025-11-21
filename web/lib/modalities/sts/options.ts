import { AIProviderOption } from "@/lib/types";

type ProviderName = "openai" | "pulse-editor";

export const stsProviderOptions: {
  [key in ProviderName]: AIProviderOption;
} = {
  openai: {
    provider: "openai",
    isSupported: true,
    models: [],
  },
  "pulse-editor": {
    provider: "pulse-editor",
    isSupported: true,
    models: [
      {
        model: "pulse-ai-llm-v1",
        isSupported: true,
      },
      {
        model: "pulse-ai-llm-v1-pro",
        isSupported: true,
      },
      {
        model: "pulse-ai-llm-v1-max",
        isSupported: true,
      },
    ],
  },
};
