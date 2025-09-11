import { fetchAPI } from "@/lib/pulse-editor-website/backend";

export class BaseMusicGen {
  private model: any;
  private generateFunc?: (
    model: any,
    prompt?: string,
    lyrics?: string,
  ) => Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }>;
  private generateStreamFunc?: (
    model: any,
    prompt?: string,
    lyrics?: string,
  ) => Promise<ReadableStream<ArrayBuffer>>;

  constructor(
    model: any,
    generateFunc?: (
      model: any,
      prompt?: string,
      lyrics?: string,
    ) => Promise<{
      arrayBuffer?: ArrayBuffer;
      url?: string;
    }>,
    generateStreamFunc?: (
      model: any,
      prompt?: string,
      lyrics?: string,
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
    prompt?: string,
    lyrics?: string,
  ): Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(this.model, prompt, lyrics);
  }

  public async generateStream(
    prompt?: string,
    lyrics?: string,
  ): Promise<ReadableStream<ArrayBuffer>> {
    if (!this.generateStreamFunc) {
      throw new Error("Generate stream function is not defined.");
    }
    return await this.generateStreamFunc(this.model, prompt, lyrics);
  }
}

export function getMusicGenModel(
  apiKey: string | undefined,
  provider: string,
  modelName: string,
): BaseMusicGen {
  let model: any;
  let generateFunc: (
    model: any,
    prompt?: string,
    lyrics?: string,
  ) => Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }>;
  let generateStreamFunc:
    | ((
        model: any,
        prompt?: string,
        lyrics?: string,
      ) => Promise<ReadableStream<ArrayBuffer>>)
    | undefined;

  async function replicateGenerateFunc(
    model: any,
    prompt?: string,
    lyrics?: string,
  ) {
    const identifier: `${string}/${string}` | `${string}/${string}:${string}` =
      modelName.includes(":")
        ? (modelName as `${string}/${string}:${string}`)
        : (modelName as `${string}/${string}`);

    const response = await fetchAPI(`/api/inference/replicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: identifier,
        input: {
          prompt: prompt,
          output_format: "png",
        },
        token: apiKey,
      }),
    });

    if (response.status !== 201) {
      throw new Error(
        `Failed to generate music: ${response.status} ${response.statusText}`,
      );
    }
    let prediction = await response.json();
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await fetchAPI(
        `/api/inference/replicate/${prediction.id}`,
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

  return new BaseMusicGen(model, generateFunc, generateStreamFunc);
}
