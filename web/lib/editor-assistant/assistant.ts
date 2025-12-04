import {
  ModelConfig,
  STSModelConfig,
  TTSModelConfig,
} from "@pulse-editor/shared-utils";
import { editorAssistantAgent } from "../agent/built-in-agents/editor-assistant";
import { LLMAgentRunner } from "../agent/llm-agent-runner";
import { STSAgentRunner } from "../agent/sts-agent-runner";
import { ModelCapabilityEnum } from "../enums";
import { BaseLLM } from "../modalities/llm/base-llm";
import { getLLMModel } from "../modalities/llm/get-llm";
import { BaseSTS } from "../modalities/sts/base-sts";
import { getSTSModel } from "../modalities/sts/get-sts";
import { getSTTModel } from "../modalities/stt/get-stt";
import { getTTSModel } from "../modalities/tts/get-tts";
import {
  AssistantEditorContextArgs,
  EditorAssistantMessage,
  UserMessage,
} from "../types";

export class Assistant {
  /**
   * Chat with assistant using a specified model.
   * @param userInput The user input can only be either text or audio.
   * @param chatSettings The chat configuration.
   * @param modelConfig The assistant's chat model configuration.
   * @param modelConfigs The fallback models if the chat model does not
   * support certain modalities.
   * @returns The assistant's response, always in text and optionally in audio.
   * The audio response depends on whether isOutputAudio is true.
   */
  public async chat(
    userInput: UserMessage,
    chatSettings: {
      isOutputAudio: boolean;
    },
    modelConfigs: {
      sts?: STSModelConfig;
      llm?: ModelConfig;
      stt?: ModelConfig;
      tts?: TTSModelConfig;
    },
    method: string,
    additionalArgs: AssistantEditorContextArgs,
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
  ): Promise<EditorAssistantMessage> {
    const chatMode = modelConfigs.sts
      ? "sts"
      : modelConfigs.llm
        ? "llm"
        : undefined;

    if (!chatMode) {
      throw new Error("No chat model configured for assistant.");
    }

    const modelConfig: ModelConfig | STSModelConfig | undefined =
      chatMode === "sts" ? modelConfigs.sts : modelConfigs.llm;

    if (!modelConfig) {
      throw new Error("Model configuration is missing.");
    }

    const model =
      chatMode === "sts" ? getSTSModel(modelConfig) : getLLMModel(modelConfig);

    if (!model) {
      throw new Error("No suitable model found.");
    }

    // Populate audio or text input based on model capabilities
    const userInputArg: UserMessage = await this.processUserInput(
      userInput,
      model,
      modelConfigs.stt,
    );

    const assistantResult = await this.runAssistantMethod(
      model,
      modelConfig,
      method,
      additionalArgs,
      userInputArg,
      chatSettings.isOutputAudio,
      onChunkUpdate,
    );

    const outputMessage: EditorAssistantMessage = {
      content: assistantResult,
      attachments: [],
    };

    const chatOutput = await this.processModelOutput(
      outputMessage,
      model,
      chatSettings.isOutputAudio,
      modelConfigs.tts,
      onChunkUpdate,
    );

    return chatOutput;
  }

  /* User can only enter one of text or audio */
  private async processUserInput(
    userInput: UserMessage,
    model: BaseLLM | BaseSTS,
    fallbackSTTModel?: ModelConfig,
  ): Promise<UserMessage> {
    const messageType = userInput.content.text
      ? ModelCapabilityEnum.Text
      : ModelCapabilityEnum.Audio;

    if (model.inputCapabilities.includes(messageType)) {
      // Return input if model supports the input type
      return {
        ...userInput,
        content: {
          text:
            messageType === ModelCapabilityEnum.Text
              ? userInput.content.text
              : undefined,
          audio:
            messageType === ModelCapabilityEnum.Audio
              ? userInput.content.audio
              : undefined,
        },
      };
    } else if (
      model.inputCapabilities.includes(ModelCapabilityEnum.Text) &&
      messageType === ModelCapabilityEnum.Audio
    ) {
      // Find a fallback STT model to convert audio to text
      if (!fallbackSTTModel) {
        throw new Error(`No model supports audio input.`);
      }

      const stt = getSTTModel({
        modelId: fallbackSTTModel.modelId,
        apiKey: fallbackSTTModel.apiKey,
      });

      const audioInput = userInput.content.audio;

      if (!audioInput) {
        throw new Error("No audio input provided.");
      }

      const text = await stt.generateStream(audioInput, "mp3");

      let transcribedText = "";
      const reader = text.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        transcribedText += value;
      }

      return {
        ...userInput,
        content: {
          text: transcribedText,
          // audio is no longer needed
          audio: undefined,
        },
      };
    } else {
      throw new Error(`Unsupported input type: ${messageType}`);
    }
  }

  private async processModelOutput(
    modelOutput: EditorAssistantMessage,
    model: BaseLLM | BaseSTS,
    isOutputAudio: boolean,
    fallbackTTSModel?: TTSModelConfig,
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
  ): Promise<EditorAssistantMessage> {
    if (!isOutputAudio) {
      // Return text output only
      return modelOutput;
    } else if (model.outputCapabilities.includes(ModelCapabilityEnum.Audio)) {
      // Return audio output directly if already audio output
      return modelOutput;
    } else {
      // Use fallback TTS model to convert text to audio
      if (!fallbackTTSModel) {
        throw new Error(`Audio output model is not available.`);
      }

      if (!modelOutput.content.text) {
        throw new Error("No text produced by model.");
      }
      const textOutput = JSON.parse(modelOutput.content.text);

      const audioContent = textOutput.response;

      const tts = getTTSModel({
        apiKey: fallbackTTSModel.apiKey,
        modelId: fallbackTTSModel.modelId,
        voiceName: fallbackTTSModel.voiceName,
      });

      if (!tts) {
        throw new Error(`Cannot find TTS model.`);
      }

      let finalResult: EditorAssistantMessage = modelOutput;

      const audio = await tts.generateStream(audioContent);

      let arrayBuffer = new ArrayBuffer(0);
      const reader = audio.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const tmp = new Uint8Array(arrayBuffer.byteLength + value.byteLength);
        tmp.set(new Uint8Array(arrayBuffer), 0);
        tmp.set(new Uint8Array(value), arrayBuffer.byteLength);
        arrayBuffer = tmp.buffer;

        finalResult = {
          content: {
            text: finalResult.content.text,
            audio: arrayBuffer,
          },
          attachments: modelOutput.attachments,
        };

        if (onChunkUpdate) {
          onChunkUpdate(
            {
              text: finalResult.content.text,
              audio: arrayBuffer,
            },
            {
              text: undefined,
              audio: value,
            },
          );
        }
      }

      return finalResult;
    }
  }

  private async runAssistantMethod(
    model: BaseLLM | BaseSTS,
    config: ModelConfig | STSModelConfig,
    method: string,
    editorContextInfo: AssistantEditorContextArgs,
    userInputArg: UserMessage,
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
    if (model instanceof BaseSTS) {
      const runner = new STSAgentRunner();
      const result = await runner.run(
        config as STSModelConfig,
        editorAssistantAgent,
        method,
        {
          audio: userInputArg.content.audio,
          args: {
            ...editorContextInfo,
            userMessage: userInputArg.content.text ?? "(user sent audio)",
          },
        },
        isOutputAudio,
        onChunkUpdate,
        abortSignal,
      );

      return result;
    } else if (model instanceof BaseLLM) {
      const runner = new LLMAgentRunner();

      const text = await runner.run(
        {
          modelId: config.modelId,
          apiKey: config.apiKey,
        },
        editorAssistantAgent,
        method,
        {
          ...editorContextInfo,
          userMessage: userInputArg.content.text,
        },
        async (allReceived?: string, newReceived?: string) => {
          if (onChunkUpdate) {
            await onChunkUpdate({ text: allReceived }, { text: newReceived });
          }
        },
        abortSignal,
      );

      return {
        text,
      };
    } else {
      throw new Error("Unsupported model type for speech agent method.");
    }
  }
}
