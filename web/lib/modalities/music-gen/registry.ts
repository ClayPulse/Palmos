import { AIProviderOption } from "@/lib/types";

export const musicGenProviderOptions: {
  [key in string]: AIProviderOption;
} = {
 "pulse-editor": {
    models: [
      "ace-step",
    ],
  },
};
