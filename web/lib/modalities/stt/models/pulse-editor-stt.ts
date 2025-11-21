import { BaseSTT } from "../base-stt";

export class PulseEditorSTT extends BaseSTT {
  constructor(modelName: string) {
    super();
  }

  public async generateStream(
    audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
  ): Promise<ReadableStream<string>> {
    // Placeholder implementation for Pulse Editor STT
    const data = [];
    return new ReadableStream({
      async start(controller) {
        controller.enqueue("Transcribed text from Pulse Editor STT.");
        controller.close();
      },
    });
  }
}
