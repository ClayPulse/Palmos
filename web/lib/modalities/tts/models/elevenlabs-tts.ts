import { ElevenLabsClient } from "elevenlabs";
import { Readable } from "stream";
import { BaseTTS } from "../base-tts";

export class ElevenLabsTTS extends BaseTTS {
  private client: ElevenLabsClient;
  private modelName: string;
  private voiceName?: string;

  constructor(apiKey: string, modelName: string, voiceName?: string) {
    super();
    this.client = new ElevenLabsClient({
      apiKey: apiKey,
    });
    this.modelName = modelName;
    this.voiceName = voiceName;
  }


  public async generateStream(text: string): Promise<ArrayBuffer> {
    const data: Readable = await this.client.generate({
      text: text,
      model_id: this.modelName,
      output_format: "mp3_22050_32",
      voice: this.voiceName,
      stream: true,
    });

    const chunks = [];
    for await (const chunk of data) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return buffer.buffer;
  }
}
