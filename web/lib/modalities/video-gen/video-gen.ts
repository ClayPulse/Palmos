export class BaseVideoGen {
  private model: any;
  private generateFunc?: (
    model: any,
    duration: number,
    textPrompt?: string,
    // URL or ArrayBuffer for the image prompt
    imagePrompt?: string | ArrayBuffer,
  ) => Promise<{
    url?: string;
    arrayBuffer?: ArrayBuffer;
  }>;
  private generateStreamFunc?: (
    model: any,
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ) => Promise<ReadableStream<ArrayBuffer>>;

  constructor(
    model: any,
    generateFunc?: (
      model: any,
      duration: number,
      textPrompt?: string,
      imagePrompt?: string | ArrayBuffer,
    ) => Promise<{
      url?: string;
      arrayBuffer?: ArrayBuffer;
    }>,
    generateStreamFunc?: (
      model: any,
      duration: number,
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
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ): Promise<{
    url?: string;
    arrayBuffer?: ArrayBuffer;
  }> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(
      this.model,
      duration,
      textPrompt,
      imagePrompt,
    );
  }

  public async generateStream(
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ): Promise<ReadableStream<ArrayBuffer>> {
    if (!this.generateStreamFunc) {
      throw new Error("Generate stream function is not defined.");
    }
    return await this.generateStreamFunc(
      this.model,
      duration,
      textPrompt,
      imagePrompt,
    );
  }
}

export function getVideoGenModel(
  apiKey: string,
  provider: string,
  modelName: string,
): BaseVideoGen {
  let model: any;
  let generateFunc: (
    model: any,
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ) => Promise<{
    url?: string;
    arrayBuffer?: ArrayBuffer;
  }>;
  let generateStreamFunc:
    | ((
        model: any,
        duration: number,
        textPrompt?: string,
        imagePrompt?: string | ArrayBuffer,
      ) => Promise<ReadableStream<ArrayBuffer>>)
    | undefined;

  async function replicateGenerateFunc(
    model: any,
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ) {
    const identifier: `${string}/${string}` | `${string}/${string}:${string}` =
      modelName.includes(":")
        ? (modelName as `${string}/${string}:${string}`)
        : (modelName as `${string}/${string}`);

    // imagePrompt must be URL if it is provided for replicate
    if (imagePrompt && !(typeof imagePrompt === "string")) {
      throw new Error(
        "Image prompt must be a string containing image url for Replicate provider.",
      );
    }

    const proxyHost = process.env.NEXT_PUBLIC_BACKEND_URL;
    const response = await fetch(`${proxyHost}/api/inference/replicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: identifier,
        input: {
          duration: duration,
          prompt: textPrompt,
          // TODO: unify input parameter name for first frame image
          image: imagePrompt,
          start_image: imagePrompt,
        },
        token: apiKey,
      }),
    });

    if (response.status !== 201) {
      throw new Error(
        `Failed to generate video: ${response.status} ${response.statusText}`,
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

    const videoUrl =
      typeof prediction.output === "string"
        ? prediction.output
        : prediction.output[prediction.output.length - 1];


    console.log("Video URL:", videoUrl);

    const arrayBuffer = await fetch(videoUrl).then((res) => res.arrayBuffer());

    return {
      url: videoUrl,
      arrayBuffer: arrayBuffer,
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

  return new BaseVideoGen(model, generateFunc, generateStreamFunc);
}
