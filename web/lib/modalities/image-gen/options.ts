import { AIProviderOption } from "@/lib/types";

type ProviderName = "replicate";

export const imageGenProviderOptions: {
  [key in ProviderName]: AIProviderOption;
} = {
  replicate: {
    provider: "replicate",
    isSupported: true,
    models: [
      {
        model: "black-forest-labs/flux-schnell",
        isSupported: true,
      },
      {
        model: "black-forest-labs/flux-1.1-pro",
        isSupported: true,
      },
      {
        model: "black-forest-labs/flux-1.1-pro-ultra",
        isSupported: true,
      },
    ],
  },
};
