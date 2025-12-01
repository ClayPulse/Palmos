import { ModelCapabilityEnum } from "@/lib/enums";

export abstract class BaseSTS {
  public inputCapabilities: ModelCapabilityEnum[];
  public outputCapabilities: ModelCapabilityEnum[];

  constructor(
    inputCapabilities?: ModelCapabilityEnum[],
    outputCapabilities?: ModelCapabilityEnum[],
  ) {
    this.inputCapabilities = inputCapabilities ?? [
      ModelCapabilityEnum.Text,
      ModelCapabilityEnum.Audio,
    ];
    this.outputCapabilities = outputCapabilities ?? [
      ModelCapabilityEnum.Text,
      ModelCapabilityEnum.Audio,
    ];
  }

  /**
   * Send multimodal data to the model and receive a stream of multimodal data in response.
   * Audio and text are sent together as separate fields like this:
   *  {
   *     "role": "user",
   *     "content": [
   *         {"type": "audio", "audio": "https://example.com/test.wav"},
   *         {"type": "text", "text": "What can you hear in this audio?"},
   *     ]
   * }
   * They are NOT sent as a combined field like this:
   * {
   *   "role": "user",
   *   "content": "Can you hear the cough in this audio? [audio data in base64] ..."
   * }
   * @param text
   * @param audio
   * @param signal
   */
  public abstract generateStream(
    text?: string,
    audio?: ArrayBuffer,
    signal?: AbortSignal,
  ): Promise<
    ReadableStream<{
      text?: string;
      audio?: ArrayBuffer;
    }>
  >;
}
