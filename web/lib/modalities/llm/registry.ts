import { AIProviderOption } from "@/lib/types";

export const llmProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [
      {
        name: "gpt-4o",
        description: "OpenAI's flagship multimodal model for complex tasks",
      },
      {
        name: "gpt-4o-mini",
        description: "Faster and more affordable version of GPT-4o",
      },
      {
        name: "gpt-4.1-mini",
        description: "GPT-4.1 mini model for efficient processing",
      },
      {
        name: "gpt-4.1",
        description: "Advanced GPT-4.1 model with improved capabilities",
      },
      {
        name: "gpt-5",
        description: "Next-generation GPT-5 model",
      },
      {
        name: "gpt-5-mini",
        description: "Compact version of GPT-5 for faster responses",
      },
    ],
  },
  anthropic: {
    models: [
      {
        name: "claude-3-5-sonnet-latest",
        description: "Latest Claude 3.5 Sonnet with enhanced reasoning",
      },
      {
        name: "claude-3-5-haiku-latest",
        description: "Fast and efficient Claude 3.5 Haiku model",
      },
    ],
  },
  "pulse-editor": {
    models: [
      {
        name: "pulse-ai-v1-turbo",
        description: "Fast Palmos AI model for quick responses",
      },
      {
        name: "pulse-ai-v1-pro",
        description: "Professional Palmos AI model with balanced performance",
      },
      // {
      //   name: "pulse-ai-v1-max",
      //   description: "Maximum capability Palmos AI model for complex tasks",
      // },
    ],
  },
  ollama: {
    models: [],
  },
};
