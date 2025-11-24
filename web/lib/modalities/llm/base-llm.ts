import { ModelCapabilityEnum } from "@/lib/enums";

export abstract class BaseLLM {
  public inputCapabilities: ModelCapabilityEnum[];
  public outputCapabilities: ModelCapabilityEnum[];

  constructor(
    inputCapabilities?: ModelCapabilityEnum[],
    outputCapabilities?: ModelCapabilityEnum[],
  ) {
    this.inputCapabilities = [
      ModelCapabilityEnum.Text,
      ...(inputCapabilities ?? []),
    ];
    this.outputCapabilities = [
      ModelCapabilityEnum.Text,
      ...(outputCapabilities ?? []),
    ];
  }

  public abstract generateStream(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<string>>;
}
