import OpenAI from "openai";
import { BaseTTS } from "../base-tts";

export class OpenAITTS extends BaseTTS {
  private model: OpenAI;
  private modelName: string;
  private voiceName: string;

  constructor(apiKey: string, modelName: string, voiceName?: string) {
    super();
    this.model = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.modelName = modelName;
    this.voiceName = voiceName ?? "echo";
  }

  public async generateStream(
    text: string,
  ): Promise<ReadableStream<ArrayBuffer>> {
    const response = await this.model.audio.speech.create({
      model: this.modelName,
      voice: this.voiceName as any,
      input: text,
    });

    if (!response.body) {
      throw new Error("No response body from OpenAI TTS");
    }

    // Turn the response into a ReadableStream<ArrayBuffer>
    const stream = response.body.pipeThrough<ArrayBuffer>(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk.buffer);
        },
      }),
    );
    return stream;
  }
}
