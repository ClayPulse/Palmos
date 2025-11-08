export class BaseSTT {
  // The model object
  private model: any;
  // A function defines how to generate the output using the model
  private generateFunc?: (
    model: any,
    audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
  ) => Promise<string>;
  // A function defines how to generate the output using the model with streaming
  private generateStreamFunc?: (
    model: any,
    audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
  ) => Promise<ReadableStream<string>>;

  constructor(
    model: any,
    generateFunc?: (
      model: any,
      audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
    ) => Promise<string>,
    generateStreamFunc?: (
      model: any,
      audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
    ) => Promise<ReadableStream<string>>,
  ) {
    this.model = model;
    this.generateFunc = generateFunc;
    this.generateStreamFunc = generateStreamFunc;
  }

  public isAllowStreaming(): boolean {
    return !!this.generateStreamFunc;
  }

  public async generate(
    audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
  ): Promise<string> {
    if (!this.generateFunc) {
      throw new Error("Generate function is not defined.");
    }
    return await this.generateFunc(this.model, audio);
  }

  public async generateStream(
    audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
  ): Promise<ReadableStream<string>> {
    if (!this.generateStreamFunc) {
      throw new Error("Generate stream function is not defined.");
    }
    return await this.generateStreamFunc(this.model, audio);
  }
}
