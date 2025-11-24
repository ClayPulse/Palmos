import { AIProviderOption } from "@/lib/types";

export const videoGenProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  replicate: {
    models: [
      "kwaivgi/kling-v1.6-standard",
      "kwaivgi/kling-v1.6-pro",
      "kwaivgi/kling-v2.0",
      "google/veo-2",
    ],
  },
};
