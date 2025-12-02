import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { BaseImageGen } from "../base-image-gen";

export class ReplicateImageGen extends BaseImageGen {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  public isAllowStreaming(): boolean {
    return false;
  }

  public async generate(
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ): Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }> {
    const identifier: `${string}/${string}` | `${string}/${string}:${string}` =
      this.modelName.includes(":")
        ? (this.modelName as `${string}/${string}:${string}`)
        : (this.modelName as `${string}/${string}`);

    const response = await fetchAPI(`/api/inference/replicate`, {
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
        token: this.apiKey,
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
      const response = await fetchAPI(
        `/api/inference/replicate/${prediction.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            token: this.apiKey,
          }),
          headers: {
            "Content-Type": "application/json",
          },
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
}
