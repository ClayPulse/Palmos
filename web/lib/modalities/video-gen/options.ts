import { AIProviderOption } from "@/lib/types";

type ProviderName = "replicate";

export const videoGenProviderOptions: {
  [key in ProviderName]: AIProviderOption;
} = {
  replicate: {
    provider: "replicate",
    isSupported: true,
    models: [
      {
        model: "kelin",
        isSupported: true,
      },
    ],
  },
};
