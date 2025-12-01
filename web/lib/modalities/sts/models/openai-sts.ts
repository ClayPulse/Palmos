import { BaseSTS } from "../base-sts";

export class OpenAISTS extends BaseSTS {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  public async generateStream(
    text?: string,
    audio?: ArrayBuffer,
    config?: {
      inputAudioFormat?: string;
    },
    abortSignal?: AbortSignal,
  ): Promise<
    ReadableStream<{
      text?: string;
      audio?: ArrayBuffer;
    }>
  > {
    throw new Error("OpenAI STS model not implemented yet");
  }
}
