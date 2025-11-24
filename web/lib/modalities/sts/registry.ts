import { AIProviderOption } from "@/lib/types";

export const stsProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  openai: {
    models: [],
  },
  "pulse-editor": {
    models: [
      {
        name: "pulse-ai-v1-turbo",
        description: "Fast speech-to-speech model for real-time conversation",
      },
      {
        name: "pulse-ai-v1-pro",
        description: "Professional speech-to-speech with balanced quality",
      },
      {
        name: "pulse-ai-v1-max",
        description: "Maximum quality speech-to-speech for natural dialogue",
      },
    ],
  },
};
