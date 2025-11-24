import { AIProviderOption } from "@/lib/types";

export const imageGenProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  replicate: {
    models: [
      "black-forest-labs/flux-schnell",
      "black-forest-labs/flux-1.1-pro",
      "black-forest-labs/flux-1.1-pro-ultra",
    ],
  },
};
