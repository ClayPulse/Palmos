export abstract class BaseMusicGen {
  public abstract isAllowStreaming(): boolean;

  public abstract generate(
    prompt?: string,
    lyrics?: string,
  ): Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }>;
}
