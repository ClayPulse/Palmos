import { AIProviderOption } from "@/lib/types";

type ProviderName = "claypulse";

export const musicGenProviderOptions: {
  [key in ProviderName]: AIProviderOption;
} = {
  claypulse: {
    provider: "claypulse",
    isSupported: true,
    models: [
      {
        model: "ace-step",
        isSupported: true,
      },
    ],
  },
};
