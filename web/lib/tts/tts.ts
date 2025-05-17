import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { Readable } from "stream";

export class BaseTTS {
  // The model object
  private model: any;
  // A function defines how to generate the output using the model
  private generateFunc?: (model: any, text: string) => Promise<Blob>;
  private generateStreamFunc?: (model: any, text: string) => Promise<Blob>;

  constructor(
    model: any,
    generateFunc?: (model: any, text: string) => Promise<Blob>,
    generateStreamFunc?: (model: any, text: string) => Promise<Blob>,
  ) {
    this.model = model;
    this.generateFunc = generateFunc;
    this.generateStreamFunc = generateStreamFunc;
  }

  public async generate(text: string): Promise<Blob> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(this.model, text);
  }

  public async generateStream(text: string): Promise<Blob> {
    if (!this.generateStreamFunc) {
      throw new Error("Generate stream function is not defined.");
    }
    return await this.generateStreamFunc(this.model, text);
  }
}

export function getModelTTS(
  apiKey: string,
  provider: string,
  modelName: string,
  voiceName?: string,
): BaseTTS {
  let model: any;
  let generateFunc: (model: any, text: string) => Promise<Blob>;
  let generateStreamFunc:
    | ((model: any, text: string) => Promise<Blob>)
    | undefined;

  async function openAIGenerateFunc(model: any, text: string) {
    const openaiModel = model as OpenAI;
    const mp3 = await openaiModel.audio.speech.create({
      model: modelName,
      voice: voiceName ?? "echo",
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const blob = new Blob([buffer], { type: "audio/mp3" });

    return blob;
  }

  async function openAIGenerateStreamFunc(model: any, text: string) {
    const openaiModel = model as OpenAI;
    const stream = await openaiModel.audio.speech.create({
      model: modelName,
      voice: voiceName ?? "echo",
      input: text,
    });

    const buffer = Buffer.from(await stream.arrayBuffer());
    const blob = new Blob([buffer], { type: "audio/mp3" });
    return blob;
  }

  async function elevenLabsGenerateFunc(model: any, text: string) {
    const client = model as ElevenLabsClient;
    const data: Readable = await client.generate({
      text: text,
      model_id: modelName,
      output_format: "mp3_22050_32",
      voice: voiceName,
    });

    const chunks = [];
    for await (const chunk of data) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const blob = new Blob([buffer], { type: "audio/mp3" });
    return blob;
  }

  async function elevenLabsGenerateStreamFunc(model: any, text: string) {
    const client = model as ElevenLabsClient;
    const data: Readable = await client.generate({
      text: text,
      model_id: modelName,
      output_format: "mp3_22050_32",
      voice: voiceName,
      stream: true,
    });

    const chunks = [];
    for await (const chunk of data) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const blob = new Blob([buffer], { type: "audio/mp3" });
    return blob;
  }

  switch (provider) {
    case "openai":
      model = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
      generateFunc = openAIGenerateFunc;
      generateStreamFunc = openAIGenerateStreamFunc;
      break;
    case "elevenlabs":
      const client = new ElevenLabsClient({
        apiKey: apiKey,
      });
      model = client;

      generateFunc = elevenLabsGenerateFunc;
      generateStreamFunc = elevenLabsGenerateStreamFunc;
      break;
    case "playht":
      throw new Error("Playht model not implemented yet");
    default:
      model = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
      generateFunc = openAIGenerateFunc;
      generateStreamFunc = openAIGenerateStreamFunc;
  }

  return new BaseTTS(model, generateFunc, generateStreamFunc);
}
