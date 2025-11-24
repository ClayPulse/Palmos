import { BaseSTS } from "../base-sts";

export class PulseEditorSTS extends BaseSTS {
  private modelName: string;

  constructor(modelName: string) {
    super();
    this.modelName = modelName;
  }

  public async generateStream(
    text?: string,
    audio?: ArrayBuffer,
    signal?: AbortSignal,
  ): Promise<
    ReadableStream<{
      text?: string;
      audio?: ArrayBuffer;
    }>
  > {
    throw new Error("Pulse Editor STS model not implemented yet");
  }
}
