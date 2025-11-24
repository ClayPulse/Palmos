import { AIProviderOption } from "@/lib/types";

export const videoGenProviderOptions: {
  [key in string]: AIProviderOption;
} = {
  replicate: {
    models: [
      {
        name: "kwaivgi/kling-v1.6-standard",
        description: "Standard quality Kling video generation model",
      },
      {
        name: "kwaivgi/kling-v1.6-pro",
        description: "Professional Kling model with enhanced video quality",
      },
      {
        name: "kwaivgi/kling-v2.0",
        description: "Latest Kling v2.0 with improved motion and coherence",
      },
      {
        name: "google/veo-2",
        description: "Google's advanced Veo 2 video generation model",
      },
    ],
  },
};
