import OpenAI from "openai";
import { BaseSTT } from "../base-stt";

export class OenAISTT_Whisper extends BaseSTT {
  private modelName: string;
  private openAIClient: OpenAI;

  constructor(apiKey: string, modelName: string) {
    super();

    const client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    this.modelName = modelName;
    this.openAIClient = client;
  }

  public async generateStream(
    audio: ArrayBuffer,
    format = "wav",
  ): Promise<ReadableStream<string>> {
    const audioBlob = new Blob([audio], { type: `audio/${format}` });
    const file = new File([audioBlob], `audio.${format}`);

    const stream = await this.openAIClient.audio.transcriptions.create({
      file: file,
      model: this.modelName,
      stream: true,
    });

    const rStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === "transcript.text.delta") {
            controller.enqueue(chunk.delta);
          }
        }

        controller.close();
      },
    });
    return rStream;
  }
}
