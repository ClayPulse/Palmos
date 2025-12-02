export abstract class BaseVideoGen {
  public abstract isAllowStreaming(): boolean;

  public abstract generate(
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ): Promise<{
    url?: string;
    arrayBuffer?: ArrayBuffer;
  }>;
}
