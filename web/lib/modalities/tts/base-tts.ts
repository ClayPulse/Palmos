export abstract class BaseTTS {
  public abstract generateStream(
    text: string,
  ): Promise<ReadableStream<ArrayBuffer>>;
}
