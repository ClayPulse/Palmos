import OpenAI from "openai";

export class BaseSTT {
  // The model object
  private model: any;
  // A function defines how to generate the output using the model
  private generateFunc?: (model: any, audio: ArrayBuffer) => Promise<string>;
  // A function defines how to generate the output using the model with streaming
  private generateStreamFunc?: (
    model: any,
    audio: ArrayBuffer,
  ) => Promise<ReadableStream<string>>;

  constructor(
    model: any,
    generateFunc?: (model: any, audio: ArrayBuffer) => Promise<string>,
    generateStreamFunc?: (
      model: any,
      audio: ArrayBuffer,
    ) => Promise<ReadableStream<string>>,
  ) {
    this.model = model;
    this.generateFunc = generateFunc;
    this.generateStreamFunc = generateStreamFunc;
  }

  public isAllowStreaming(): boolean {
    return !!this.generateStreamFunc;
  }

  public async generate(audio: ArrayBuffer): Promise<string> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(this.model, audio);
  }

  public async generateStream(
    audio: ArrayBuffer,
  ): Promise<ReadableStream<string>> {
    if (!this.generateStreamFunc) {
      throw new Error("Generate stream function is not defined.");
    }
    return await this.generateStreamFunc(this.model, audio);
  }
}

export function getModelSTT(
  apiKey: string,
  provider: string,
  modelName: string,
): BaseSTT {
  let model: any;
  let generateFunc: (model: any, audio: ArrayBuffer) => Promise<string>;
  let generateStreamFunc:
    | ((model: any, audio: ArrayBuffer) => Promise<ReadableStream<string>>)
    | undefined;

  async function openAIGenerateFunc(model: any, audio: ArrayBuffer) {
    const file = new File([audio], "audio.wav", { type: "audio/wav" });
    const { text } = await model.audio.transcriptions.create({
      file: file,
      model: modelName,
    });
    return text;
  }

  async function openAIGenerateStreamFunc(model: any, audio: ArrayBuffer) {
    const openAIModel = model as OpenAI;
    const file = new File([audio], "audio.wav", { type: "audio/wav" });

    const stream = await openAIModel.audio.transcriptions.create({
      model: modelName,
      stream: true,
      file: file,
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

  switch (provider) {
    case "openai":
      model = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
      generateFunc = openAIGenerateFunc;
      generateStreamFunc = openAIGenerateStreamFunc;

    default:
      model = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
      generateFunc = openAIGenerateFunc;
      generateStreamFunc = openAIGenerateStreamFunc;
  }

  return new BaseSTT(model, generateFunc, generateStreamFunc);
}
