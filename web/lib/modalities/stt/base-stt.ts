export abstract class BaseSTT {
  public abstract generateStream(
    audio: ArrayBuffer,
    format?: string,
  ): Promise<ReadableStream<string>>;
}
