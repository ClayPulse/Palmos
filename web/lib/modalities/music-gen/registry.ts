import { AIProviderOption } from "@/lib/types";

export const musicGenProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  "pulse-editor": {
    models: [
      {
        name: "ace-step",
        description: "AI music generation with customizable style and tempo",
      },
    ],
  },
};
