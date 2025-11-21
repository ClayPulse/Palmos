import { ModelDataTypeEnum } from "@/lib/enums";

export abstract class BaseLLM {
  public inputCapabilities: ModelDataTypeEnum[];
  public outputCapabilities: ModelDataTypeEnum[];

  constructor(
    inputCapabilities?: ModelDataTypeEnum[],
    outputCapabilities?: ModelDataTypeEnum[],
  ) {
    this.inputCapabilities = [
      ModelDataTypeEnum.Text,
      ...(inputCapabilities ?? []),
    ];
    this.outputCapabilities = [
      ModelDataTypeEnum.Text,
      ...(outputCapabilities ?? []),
    ];
  }

  public abstract generateStream(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<string>>;
}
