import { TypedVariableType } from "@pulse-editor/shared-utils";
import { decode } from "@toon-format/toon";
import { editorAssistantAgent } from "../agent/built-in-agents/editor-assistant";
import { runLLMAgentMethod } from "../agent/llm-agent-runner";
import { ModelDataTypeEnum } from "../enums";
import { BaseLLM } from "../modalities/llm/base-llm";
import { getLLMModel } from "../modalities/llm/get-llm";
import { BaseSTS } from "../modalities/sts/base-sts";
import { getSTSModel } from "../modalities/sts/get-sts";
import { getSTTModel } from "../modalities/stt/get-stt";
import { getTTSModel } from "../modalities/tts/tts";
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
            userMessage: userInput.message.text,
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
  const sts = getSTSModel(modelConfig);

  if (sts) {
    return sts;
  }

  // If STS is not found, try to get LLM model
  const llm = getLLMModel(modelConfig);

  return llm;
}

/* User can only enter one of text or audio */
async function processUserInput(
  userInput: UserMessage,
  model: BaseLLM | BaseSTS,
  fallbackModels: FallbackModelConfig,
): Promise<PlatformAssistantMessage> {
  const messageType = userInput.message.text
    ? ModelDataTypeEnum.Text
    : ModelDataTypeEnum.Audio;

  if (model.inputCapabilities.includes(messageType)) {
    // Return input if model supports the input type
    return {
      ...userInput,
      message: {
        text:
          messageType === ModelDataTypeEnum.Text
            ? userInput.message.text
            : undefined,
        audio:
          messageType === ModelDataTypeEnum.Audio
            ? userInput.message.audio
            : undefined,
      },
    };
  } else if (
    model.inputCapabilities.includes(ModelDataTypeEnum.Text) &&
    messageType === ModelDataTypeEnum.Audio
  ) {
    // Find a fallback STT model to convert audio to text
    if (!fallbackModels.stt) {
      throw new Error(`No model supports audio input.`);
    }

    const stt = getSTTModel(
      fallbackModels.stt.apiKey,
      fallbackModels.stt.provider,
      fallbackModels.stt.modelName,
    );

    const audioInput = userInput.message.audio;

    if (!audioInput) {
      throw new Error("No audio input provided.");
    }

    const text = await stt.generate(audioInput);

    return {
      ...userInput,
      message: {
        text,
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
      const tts = getTTSModel(
        fallbackModels.tts.apiKey,
        fallbackModels.tts.provider,
        fallbackModels.tts.modelName,
      );
      const textOutput = modelOutput.message.text;

      if (!textOutput) {
        throw new Error("No text output to convert to audio.");
      }

      const audioContent = (
        decode(textOutput) as {
          response: string;
        }
      ).response;

      const audio = await tts.generate(audioContent);
      const arrayBuffer = await audio.arrayBuffer();

      return {
        message: {
          text: textOutput,
          audio: arrayBuffer,
        },
        attachments: modelOutput.attachments,
      };
    }
  }
}
