import { AIProviderOption } from "@/lib/types";

export const imageGenProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  replicate: {
    models: [
      {
        name: "black-forest-labs/flux-schnell",
        description: "Flux Schnell model for fast image generation",
      },
      {
        name: "black-forest-labs/flux-1.1-pro",
        description: "Flux 1.1 Pro model for high-quality image generation",
      },
      {
        name: "black-forest-labs/flux-1.1-pro-ultra",
        description:
          "Flux 1.1 Pro Ultra model for ultra high-quality image generation",
      },
    ],
  },
};
