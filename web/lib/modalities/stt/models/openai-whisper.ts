import OpenAI from "openai";
import { BaseSTT } from "../base-stt";

export class OpenAIWhisperSTT extends BaseSTT {
  constructor(apiKey: string, modelName: string) {
    async function openAIGenerateFunc(
      model: any,
      audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
    ) {
      const data = [];

      if (audio instanceof ArrayBuffer) {
        data.push(audio);
      } else {
        const reader = audio.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          data.push(value);
        }
      }

      const audioBlob = new Blob(data, { type: "audio/wav" });

      const file = new File([audioBlob], "audio.wav", { type: "audio/wav" });
      const { text } = await model.audio.transcriptions.create({
        file: file,
        model: modelName,
      });
      return text;
    }

    async function openAIGenerateStreamFunc(
      model: any,
      audio: ReadableStream<ArrayBuffer> | ArrayBuffer,
    ) {
      const openAIModel = model as OpenAI;

      const data = [];

      if (audio instanceof ArrayBuffer) {
        data.push(audio);
      } else {
        const reader = audio.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          data.push(value);
        }
      }

      const audioBlob = new Blob(data, { type: "audio/wav" });
      const file = new File([audioBlob], "audio.wav", { type: "audio/wav" });

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

    const model = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    super(model, openAIGenerateFunc, openAIGenerateStreamFunc);
  }
}
