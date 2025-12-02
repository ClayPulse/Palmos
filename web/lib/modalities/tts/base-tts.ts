export abstract class BaseTTS {
  public abstract generateStream(
    text: string,
    format?: string,
  ): Promise<ReadableStream<ArrayBuffer>>;
}
