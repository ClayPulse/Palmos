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
        model: "kwaivgi/kling-v1.6-standard",
        isSupported: true,
      },
      {
        model: "kwaivgi/kling-v1.6-pro",
        isSupported: true,
      },

      {
        model: "kwaivgi/kling-v2.0",
        isSupported: true,
      },
      {
        model: "google/veo-2",
        isSupported: true,
      },
    ],
  },
};
