import {
  arrayBufferToBase64,
  pcm16Base64ToArrayBuffer,
} from "@/lib/audio-utils/utils";
import { parseNDJSONStream } from "@/lib/data-streaming/stream-chunk-parsers";
import { toUnifiedStream } from "@/lib/data-streaming/unified-stream";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { BaseSTS } from "../base-sts";

export class PulseEditorSTS extends BaseSTS {
  private modelName: string;

  constructor(modelName: string) {
    super();
    this.modelName = modelName;
  }

  public async generateStream(
    text?: string,
    audio?: ArrayBuffer,
    config?: {
      inputAudioFormat?: string;
      isOutputAudio?: boolean;
    },
    abortSignal?: AbortSignal,
  ): Promise<
    ReadableStream<{
      text?: string;
      audio?: ArrayBuffer;
    }>
  > {
    // convert audio to base64
    const audioBase64 = audio ? arrayBufferToBase64(audio) : undefined;

    const response = await fetchAPI(`/api/inference/pulse-editor/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelName,
        prompt: {
          text,
          audio: audioBase64,
        },
        temperature: 1,
        isOutputAudio: config?.isOutputAudio,
        inputAudioFormat: config?.inputAudioFormat,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`PulseEditorSTS API error: ${await response.text()}`);
    }

    const stream = response.body;

    if (!stream) {
      throw new Error("No response body from PulseEditor STS");
    }

    // ReadableStream cannot pass JSON objects via HTTP request, so we convert them back to object here
    const finalStream = new ReadableStream<{
      text?: string;
      audio?: ArrayBuffer;
    }>({
      async start(controller) {
        let base64AudioBuffer: string = "";
        await parseNDJSONStream(toUnifiedStream(stream), async (data) => {
          const { text, audio }: { text?: string; audio?: string } = data;
          const audioBuffer = audio
            ? await pcm16Base64ToArrayBuffer(audio)
            : undefined;
          controller.enqueue({ text, audio: audioBuffer });

          base64AudioBuffer += audio;
        });

        controller.close();
      },
    });

    return finalStream;
  }
}
