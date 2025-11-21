export abstract class BaseSTT {
  public abstract generateStream(
    audio: ArrayBuffer,
  ): Promise<ReadableStream<string>>;
}
