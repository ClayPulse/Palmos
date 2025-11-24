import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { BaseVideoGen } from "../base-video-gen";

export class ReplicateVideoGen extends BaseVideoGen {
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
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
  ): Promise<{
    url?: string;
    arrayBuffer?: ArrayBuffer;
  }> {
    const identifier: `${string}/${string}` | `${string}/${string}:${string}` =
      this.modelName.includes(":")
        ? (this.modelName as `${string}/${string}:${string}`)
        : (this.modelName as `${string}/${string}`);

    // imagePrompt must be URL if it is provided for replicate
    if (imagePrompt && !(typeof imagePrompt === "string")) {
      throw new Error(
        "Image prompt must be a string containing image url for Replicate provider.",
      );
    }

    const response = await fetchAPI(`/api/inference/replicate`, {
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
        token: this.apiKey,
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
}
