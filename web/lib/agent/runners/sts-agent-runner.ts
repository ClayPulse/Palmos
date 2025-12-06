import { Agent, STSModelConfig } from "@pulse-editor/shared-utils";
import { BaseSTS } from "../../modalities/sts/base-sts";
import { getSTSModel } from "../../modalities/sts/get-sts";
import { getAgentTextPrompt } from "../prompt";
import { parseToonToJSON } from "../toon-parser";

export class STSAgentRunner {
  public async run(
    modelConfig: STSModelConfig,
    agent: Agent,
    methodName: string,
    input: {
      audio?: ArrayBuffer;
      args: Record<string, any>;
    },
    isOutputAudio?: boolean,
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
      isOutputAudio,
      onChunkUpdate,
      abortSignal,
    );

    return result;
  }

  private async runSTS(
    sts: BaseSTS,
    prompt?: string,
    audioInput?: ArrayBuffer,
    isOutputAudio?: boolean,
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
        isOutputAudio: isOutputAudio,
      },
      abortSignal,
    );

    const reader = stream.getReader();

    let finalText = "";
    let finalAudioBuffer: ArrayBuffer = new ArrayBuffer(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      finalText += value.text ?? "";
      finalAudioBuffer = (() => {
        if (!value.audio) return finalAudioBuffer;
        const tmp = new Uint8Array(
          finalAudioBuffer.byteLength + value.audio.byteLength,
        );
        tmp.set(new Uint8Array(finalAudioBuffer), 0);
        tmp.set(new Uint8Array(value.audio), finalAudioBuffer.byteLength);
        return tmp.buffer;
      })();

      const chunk: {
        text?: string;
        audio?: ArrayBuffer;
      } = {
        text: JSON.stringify(value.text),
        audio: value.audio,
      };

      if (onChunkUpdate) {
        await onChunkUpdate(
          {
            text: JSON.stringify(parseToonToJSON(finalText)),
            audio: finalAudioBuffer,
          },
          chunk,
        );
      }
    }

    return {
      text: JSON.stringify(parseToonToJSON(finalText)),
      audio: finalAudioBuffer,
    };
  }
}
