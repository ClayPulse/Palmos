export abstract class BaseImageGen {
  public abstract isAllowStreaming(): boolean;

  public abstract generate(
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ): Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }>;
}
