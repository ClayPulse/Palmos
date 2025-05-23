export type LLMProviderOption = {
  provider: string;
  isSupported: boolean;
  models: {
    model: string;
    // TODO: do not enforce supported models in the future
    // and allow users to enter any model from the provider.
    // Available models should be displayed in a dropdown
    // as suggestions.
    isSupported: boolean;
  }[];
};

type ProviderName = "openai" | "anthropic" | "togetherai" | "local";

export const llmProviderOptions: {
  [key in ProviderName]: LLMProviderOption;
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
    ],
  },
  anthropic: {
    provider: "anthropic",
    isSupported: true,
    models: [
      {
        model: "claude-3-5-sonnet-latest",
        isSupported: false,
      },
      {
        model: "claude-3-5-haiku-latest",
        isSupported: false,
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
  local: {
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
