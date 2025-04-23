export interface STTProviderOption {
  provider: string;
  isSupported: boolean;
  models: {
    model: string;
    isSupported: boolean;
  }[];
}

export const sttProviderOptions: STTProviderOption[] = [
  {
    provider: "openai",
    isSupported: true,
    models: [
      {
        model: "whisper-1",
        isSupported: true,
      },
      {
        model: "gpt-4o-transcribe",
        isSupported: true,
      },
      {
        model: "gpt-4o-mini-transcribe",
        isSupported: true,
      },
    ],
  },
];
