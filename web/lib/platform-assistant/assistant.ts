import { TypedVariableType } from "@pulse-editor/shared-utils";
import { decode } from "@toon-format/toon";
import { editorAssistantAgent } from "../agent/built-in-agents/editor-assistant";
import { runLLMAgentMethod } from "../agent/llm-agent-runner";
import { ModelCapabilityEnum } from "../enums";
import { BaseLLM } from "../modalities/llm/base-llm";
import { getLLMModel } from "../modalities/llm/get-llm";
import { llmProviderOptions } from "../modalities/llm/registry";
import { BaseSTS } from "../modalities/sts/base-sts";
import { getSTSModel } from "../modalities/sts/get-sts";
import { stsProviderOptions } from "../modalities/sts/registry";
import { getSTTModel } from "../modalities/stt/get-stt";
import { getTTSModel } from "../modalities/tts/get-tts";
import { ModelConfig, PlatformAssistantMessage, UserMessage } from "../types";

type FallbackModelConfig = {
  stt?: {
    provider: string;
    modelName: string;
    apiKey: string;
  };
  tts?: {
    provider: string;
    modelName: string;
    apiKey: string;
    voiceName?: string;
  };
};

/**
 * Chat with assistant using a specified model.
 * @param userInput The user input can only be either text or audio.
 * @param chatSettings The chat configuration.
 * @param modelConfig The assistant's chat model configuration.
 * @param fallbackModelConfig The fallback models if the chat model does not
 * support certain modalities.
 * @returns The assistant's response, always in text and optionally in audio.
 * The audio response depends on whether isOutputAudio is true.
 */
export async function chatWithAssistant(
  userInput: UserMessage,
  chatSettings: {
    isOutputAudio: boolean;
  },
  modelConfig: ModelConfig,
  fallbackModelConfig: FallbackModelConfig,
  editorContextInfo: {
    chatHistory: PlatformAssistantMessage[];
    activeTabView: string;
    availableCommands: {
      cmdName: string;
      parameters: {
        name: string;
        type: TypedVariableType;
        description: string;
      }[];
    }[];
    projectDirTree: any[];
  },
): Promise<PlatformAssistantMessage> {
  const model: BaseLLM | BaseSTS | undefined = getChatModel(modelConfig);
  if (!model) {
    throw new Error("No suitable model found.");
  }

  // Populate audio or text input based on model capabilities
  const userInputArg: UserMessage = await processUserInput(
    userInput,
    model,
    fallbackModelConfig,
  );

  if (model instanceof BaseLLM) {
    const outputMessage: PlatformAssistantMessage = {
      message: {
        text: await runLLMAgentMethod(
          {
            provider: modelConfig.provider,
            modelName: modelConfig.modelName,
            apiKey: modelConfig.apiKey,
          },
          editorAssistantAgent,
          "useAppActions",
          {
            ...editorContextInfo,
            userMessage: userInputArg.message.text,
          },
        ),
      },
      attachments: [],
    };

    const chatOutput = await processModelOutput(
      outputMessage,
      chatSettings.isOutputAudio,
      fallbackModelConfig,
    );

    return chatOutput;
  } else if (model instanceof BaseSTS) {
    throw new Error("STS model chat not implemented yet");

    // const modelOutput = await model.generateStream(userInputArg as ArrayBuffer);

    // return {
    //   message: {},
    //   attachments: [],
    // };
  }

  throw new Error("Unsupported model type.");
}

function getChatModel(modelConfig: ModelConfig): BaseLLM | BaseSTS | undefined {
  const stsOption =
    stsProviderOptions[modelConfig.provider as keyof typeof stsProviderOptions];

  const isSupportedInSTS = stsOption.models.some(
    (m) => m.name === modelConfig.modelName,
  );

  if (isSupportedInSTS) {
    return getSTSModel(modelConfig);
  }

  // If STS is not found, try to get LLM model
  const llmOption =
    llmProviderOptions[modelConfig.provider as keyof typeof llmProviderOptions];

  const isSupportedInLLM = llmOption.models.some(
    (m) => m.name === modelConfig.modelName,
  );

  if (isSupportedInLLM) {
    return getLLMModel(modelConfig);
  }

  return undefined;
}

/* User can only enter one of text or audio */
async function processUserInput(
  userInput: UserMessage,
  model: BaseLLM | BaseSTS,
  fallbackModels: FallbackModelConfig,
): Promise<UserMessage> {
  const messageType = userInput.message.text
    ? ModelCapabilityEnum.Text
    : ModelCapabilityEnum.Audio;

  if (model.inputCapabilities.includes(messageType)) {
    // Return input if model supports the input type
    return {
      ...userInput,
      message: {
        text:
          messageType === ModelCapabilityEnum.Text
            ? userInput.message.text
            : undefined,
        audio:
          messageType === ModelCapabilityEnum.Audio
            ? userInput.message.audio
            : undefined,
      },
    };
  } else if (
    model.inputCapabilities.includes(ModelCapabilityEnum.Text) &&
    messageType === ModelCapabilityEnum.Audio
  ) {
    // Find a fallback STT model to convert audio to text
    if (!fallbackModels.stt) {
      throw new Error(`No model supports audio input.`);
    }

    const stt = getSTTModel({
      provider: fallbackModels.stt.provider,
      modelName: fallbackModels.stt.modelName,
      apiKey: fallbackModels.stt.apiKey,
    });

    const audioInput = userInput.message.audio;

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
      message: {
        text: transcribedText,
        // audio is no longer needed
        audio: undefined,
      },
    };
  } else {
    throw new Error(`Unsupported input type: ${messageType}`);
  }
}

async function processModelOutput(
  modelOutput: PlatformAssistantMessage,
  isOutputAudio: boolean,
  fallbackModels: FallbackModelConfig,
): Promise<PlatformAssistantMessage> {
  if (!isOutputAudio) {
    // Return text output only
    return modelOutput;
  } else {
    if (modelOutput.message.audio) {
      // Return audio output directly if already audio output
      return modelOutput;
    } else {
      // Use fallback TTS model to convert text to audio
      if (!fallbackModels.tts) {
        throw new Error(`No model supports audio output.`);
      }
      const tts = getTTSModel({
        apiKey: fallbackModels.tts.apiKey,
        provider: fallbackModels.tts.provider,
        modelName: fallbackModels.tts.modelName,
        voiceName: fallbackModels.tts.voiceName,
      });

      if (!tts) {
        throw new Error(`No model supports audio output.`);
      }

      const textOutput = modelOutput.message.text;

      if (!textOutput) {
        throw new Error("No text output to convert to audio.");
      }

      const audioContent = (
        decode(textOutput) as {
          response: string;
        }
      ).response;

      const audio = await tts.generateStream(audioContent);

      return {
        message: {
          text: textOutput,
          audio: audio,
        },
        attachments: modelOutput.attachments,
      };
    }
  }
}
