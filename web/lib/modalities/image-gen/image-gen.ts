import Replicate from "replicate";

export class BaseImageGen {
  private model: any;
  private generateFunc?: (
    model: any,
    textPrompt?: string,
    imagePrompt?: string,
  ) => Promise<ArrayBuffer>;
  private generateStreamFunc?: (
    model: any,
    textPrompt?: string,
    imagePrompt?: string,
  ) => Promise<ReadableStream<ArrayBuffer>>;

  constructor(
    model: any,
    generateFunc?: (
      model: any,
      textPrompt?: string,
      imagePrompt?: string,
    ) => Promise<ArrayBuffer>,
    generateStreamFunc?: (
      model: any,
      textPrompt?: string,
      imagePrompt?: string,
    ) => Promise<ReadableStream<ArrayBuffer>>,
  ) {
    this.model = model;
    this.generateFunc = generateFunc;
    this.generateStreamFunc = generateStreamFunc;
  }

  public isAllowStreaming(): boolean {
    return !!this.generateStreamFunc;
  }

  public async generate(
    textPrompt?: string,
    imagePrompt?: string,
  ): Promise<ArrayBuffer> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(this.model, textPrompt, imagePrompt);
  }

  public async generateStream(
    textPrompt?: string,
    imagePrompt?: string,
  ): Promise<ReadableStream<ArrayBuffer>> {
    if (!this.generateStreamFunc) {
      throw new Error("Generate stream function is not defined.");
    }
    return await this.generateStreamFunc(this.model, textPrompt, imagePrompt);
  }
}

export function getImageGenModel(
  apiKey: string,
  provider: string,
  modelName: string,
): BaseImageGen {
  let model: any;
  let generateFunc: (
    model: any,
    textPrompt?: string,
    imagePrompt?: string,
  ) => Promise<ArrayBuffer>;
  let generateStreamFunc:
    | ((
        model: any,
        textPrompt?: string,
        imagePrompt?: string,
      ) => Promise<ReadableStream<ArrayBuffer>>)
    | undefined;

  async function replicateGenerateFunc(
    model: any,
    textPrompt?: string,
    imagePrompt?: string,
  ) {
    const replicate: Replicate = model;
    const identifier: `${string}/${string}` | `${string}/${string}:${string}` =
      modelName.includes(":")
        ? (modelName as `${string}/${string}:${string}`)
        : (modelName as `${string}/${string}`);
    const obj = await replicate.run(identifier, {
      input: {
        prompt: textPrompt,
        image: imagePrompt,
      },
    });
    const result = new Blob([JSON.stringify(obj)], {
      type: "application/json",
    });
    const arrayBuffer = await result.arrayBuffer();
    return arrayBuffer;
  }

  switch (provider) {
    case "replicate":
      model = new Replicate({
        auth: apiKey,
      });
      generateFunc = replicateGenerateFunc;
      generateStreamFunc = undefined;
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  return new BaseImageGen(model, generateFunc, generateStreamFunc);
}
