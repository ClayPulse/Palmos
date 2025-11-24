import { AIProviderOption } from "@/lib/types";

export const llmProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1-mini",
      "gpt-4.1",
      "gpt-5",
      "gpt-5-mini",
    ],
  },
  anthropic: {
    models: [
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
    ],
  },
  "pulse-editor": {
    models: [
      "pulse-ai-v1-turbo",
      "pulse-ai-v1-pro",
      "pulse-ai-v1-max",
    ],
  },
  ollama: {
    models: [],
  },
};
