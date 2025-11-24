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


  public async generateStream(text: string): Promise<ArrayBuffer> {
    const stream = await this.model.audio.speech.create({
      model: this.modelName,
      voice: this.voiceName as any,
      input: text,
    });
    const buffer = Buffer.from(await stream.arrayBuffer());
    return buffer.buffer;
  }
}
