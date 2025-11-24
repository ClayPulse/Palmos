import { AIProviderOption } from "@/lib/types";

export const stsProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [],
  },
  "pulse-editor": {
    models: [
      "pulse-ai-v1-turbo",
      "pulse-ai-v1-pro",
      "pulse-ai-v1-max",
    ],
  },
};
