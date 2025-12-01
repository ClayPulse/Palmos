import { Agent, STSModelConfig } from "@pulse-editor/shared-utils";
import { BaseSTS } from "../modalities/sts/base-sts";
import { getSTSModel } from "../modalities/sts/get-sts";
import { getAgentTextPrompt } from "./prompt";

export class STSAgentRunner {
  public async run(
    modelConfig: STSModelConfig,
    agent: Agent,
    methodName: string,
    input: {
      audio?: ArrayBuffer;
      args: Record<string, any>;
    },
    onChunkUpdate?: (
      allReceived?: {
        text?: string;
        audio?: ArrayBuffer;
      },
      newReceived?: {
        text?: string;
        audio?: ArrayBuffer;
      },
    ) => Promise<void>,
    abortSignal?: AbortSignal,
  ): Promise<{
    text?: string;
    audio?: ArrayBuffer;
  }> {
    const method = agent.availableMethods.find((m) => m.name === methodName);
    if (!method) {
      throw new Error(`Method ${methodName} not found in agent ${agent.name}.`);
    }

    const textPrompt = await getAgentTextPrompt(agent, method, input.args);

    const sts = getSTSModel(modelConfig);

    if (!sts) {
      throw new Error("No suitable STS model found.");
    }

    const result = await this.runSTS(
      sts,
      textPrompt,
      input.audio,
      onChunkUpdate,
      abortSignal,
    );

    return result;
  }

  private async runSTS(
    sts: BaseSTS,
    prompt?: string,
    audioInput?: ArrayBuffer,
    onChunkUpdate?: (
      allReceived?: {
        text?: string;
        audio?: ArrayBuffer;
      },
      newReceived?: {
        text?: string;
        audio?: ArrayBuffer;
      },
    ) => Promise<void>,
    abortSignal?: AbortSignal,
  ) {
    const stream = await sts.generateStream(
      prompt,
      audioInput,
      {
        inputAudioFormat: "wav",
      },
      abortSignal,
    );

    const reader = stream.getReader();

    let finalText = "";
    let finalAudioBuffer: ArrayBuffer = new ArrayBuffer(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk: {
        text?: string;
        audio?: ArrayBuffer;
      } = {
        text: value.text,
        audio: value.audio,
      };

      finalText += chunk.text ?? "";
      finalAudioBuffer = (() => {
        if (!chunk.audio) return finalAudioBuffer;
        const tmp = new Uint8Array(
          finalAudioBuffer.byteLength + chunk.audio.byteLength,
        );
        tmp.set(new Uint8Array(finalAudioBuffer), 0);
        tmp.set(new Uint8Array(chunk.audio), finalAudioBuffer.byteLength);
        return tmp.buffer;
      })();

      if (onChunkUpdate) {
        await onChunkUpdate(
          {
            text: finalText,
            audio: finalAudioBuffer,
          },
          chunk,
        );
      }
    }

    return {
      text: finalText,
      audio: finalAudioBuffer,
    };
  }
}
