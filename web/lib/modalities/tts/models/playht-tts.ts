import { BaseTTS } from "../base-tts";

export class PlayHTTTS extends BaseTTS {
  private apiKey: string;
  private modelName: string;
  private voiceName?: string;

  constructor(apiKey: string, modelName: string, voiceName?: string) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.voiceName = voiceName;
  }

  public async generateStream(
    text: string,
  ): Promise<ReadableStream<ArrayBuffer>> {
    throw new Error("PlayHT model not implemented yet");
  }
}
