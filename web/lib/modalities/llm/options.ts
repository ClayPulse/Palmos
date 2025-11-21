import { AIProviderOption } from "@/lib/types";

type ProviderName =
  | "openai"
  | "anthropic"
  | "togetherai"
  | "ollama"
  | "pulse-editor";

export const llmProviderOptions: {
  [key in ProviderName]: AIProviderOption;
} = {
  openai: {
    provider: "openai",
    isSupported: true,
    models: [
      {
        model: "gpt-4o",
        isSupported: true,
      },
      {
        model: "gpt-4o-mini",
        isSupported: true,
      },
      {
        model: "gpt-4.1-mini",
        isSupported: true,
      },
      {
        model: "gpt-4.1",
        isSupported: true,
      },
      {
        model: "gpt-5",
        isSupported: true,
      },
      {
        model: "gpt-5-mini",
        isSupported: true,
      },
    ],
  },
  anthropic: {
    provider: "anthropic",
    isSupported: true,
    models: [
      {
        model: "claude-3-5-sonnet-latest",
        isSupported: true,
      },
      {
        model: "claude-3-5-haiku-latest",
        isSupported: true,
      },
    ],
  },
  togetherai: {
    provider: "togetherai",
    isSupported: true,
    models: [
      {
        model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
        isSupported: false,
      },
      {
        model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        isSupported: false,
      },
      {
        model: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
        isSupported: false,
      },
      {
        model: "codellama/CodeLlama-34b-Instruct-hf",
        isSupported: false,
      },
    ],
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
  ollama: {
    provider: "local",
    isSupported: true,
    models: [
      {
        model: "llama-3.2-3B",
        isSupported: false,
      },
    ],
  },
};
