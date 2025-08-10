export class BaseImageGen {
  private model: any;
  private generateFunc?: (
    model: any,
    textPrompt?: string,
    // URL or ArrayBuffer for the image prompt
    imagePrompt?: string | ArrayBuffer,
  ) => Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }>;
  private generateStreamFunc?: (
    model: any,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ) => Promise<ReadableStream<ArrayBuffer>>;

  constructor(
    model: any,
    generateFunc?: (
      model: any,
      textPrompt?: string,
      imagePrompt?: string | ArrayBuffer,
    ) => Promise<{
      arrayBuffer?: ArrayBuffer;
      url?: string;
    }>,
    generateStreamFunc?: (
      model: any,
      textPrompt?: string,
      imagePrompt?: string | ArrayBuffer,
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
    imagePrompt?: string | ArrayBuffer,
  ): Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(this.model, textPrompt, imagePrompt);
  }

  public async generateStream(
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
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
    imagePrompt?: string | ArrayBuffer,
  ) => Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }>;
  let generateStreamFunc:
    | ((
        model: any,
        textPrompt?: string,
        imagePrompt?: string | ArrayBuffer,
      ) => Promise<ReadableStream<ArrayBuffer>>)
    | undefined;

  async function replicateGenerateFunc(
    model: any,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ) {
    const identifier: `${string}/${string}` | `${string}/${string}:${string}` =
      modelName.includes(":")
        ? (modelName as `${string}/${string}:${string}`)
        : (modelName as `${string}/${string}`);

    const proxyHost = process.env.NEXT_PUBLIC_BACKEND_URL;
    const response = await fetch(`${proxyHost}/api/inference/replicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: identifier,
        input: {
          prompt: textPrompt,
          output_format: "png",
        },
        token: apiKey,
      }),
    });

    if (response.status !== 201) {
      throw new Error(
        `Failed to generate image: ${response.status} ${response.statusText}`,
      );
    }
    let prediction = await response.json();
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await fetch(
        `${proxyHost}/api/inference/replicate/${prediction.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            token: apiKey,
          }),
        },
      );
      console.log("Fetching prediction status:", prediction.id);
      prediction = await response.json();
      if (response.status !== 200) {
        console.error(
          `Error fetching prediction status: ${response.status} ${response.statusText}`,
        );
        throw new Error(
          `Failed to fetch prediction status: ${response.status} ${response.statusText}`,
        );
      }
      console.log({ prediction: prediction });
    }

    // Get the last output if output is an array, else if it is string get the output directly
    const imgUrl =
      typeof prediction.output === "string"
        ? prediction.output
        : prediction.output[prediction.output.length - 1];

    const arrayBuffer = await fetch(imgUrl).then((res) => res.arrayBuffer());

    return {
      arrayBuffer: arrayBuffer,
      url: imgUrl,
    };
  }

  switch (provider) {
    case "replicate":
      model = undefined;
      generateFunc = replicateGenerateFunc;
      generateStreamFunc = undefined;
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  return new BaseImageGen(model, generateFunc, generateStreamFunc);
}
