"use client";

import { runAgentMethodLocal } from "@/lib/agent/agent-runner";
import { getImageGenModel } from "@/lib/modalities/image-gen/image-gen";
import { getLLMModel } from "@/lib/modalities/llm/llm";
import { recognizeText } from "@/lib/modalities/ocr/ocr";
import { getSTTModel } from "@/lib/modalities/stt/stt";
import { getTTSModel } from "@/lib/modalities/tts/tts";
import {
  getDefaultImageModelConfig,
  getDefaultLLMConfig,
  getDefaultSTTConfig,
  getDefaultTTSConfig,
  getDefaultVideoModelConfig,
} from "@/lib/modalities/utils";
import { getVideoGenModel } from "@/lib/modalities/video-gen/video-gen";
import { getAPIKey } from "@/lib/settings/api-manager-utils";
import { IMCContextType } from "@/lib/types";
import {
  Action,
  ImageModelConfig,
  IMCMessage,
  IMCMessageTypeEnum,
  LLMConfig,
  PolyIMC,
  ReceiverHandler,
  STTConfig,
  TTSConfig,
} from "@pulse-editor/shared-utils";
import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useRef } from "react";
import { EditorContext } from "./editor-context-provider";

export const IMCContext = createContext<IMCContextType | undefined>(undefined);

export default function InterModuleCommunicationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const editorContext = useContext(EditorContext);
  const { resolvedTheme } = useTheme();

  const polyIMCRef = useRef<PolyIMC | undefined>(undefined);
  const imcInitializedMapRef = useRef<Map<string, boolean>>(new Map());
  const imcInitializedResolvePromisesRef = useRef<{
    [key: string]: () => void;
  }>({});

  const actionRegisteredMapRef = useRef<Map<string, boolean>>(new Map());
  const actionRegisteredResolvePromisesRef = useRef<{
    [key: string]: () => void;
  }>({});

  useEffect(() => {
    // @ts-expect-error set window viewId
    window.viewId = "Pulse Editor Main";
    polyIMCRef.current = new PolyIMC(getHandlerMap());

    return () => {
      // Cleanup the polyIMC instance when the component unmounts
      if (polyIMCRef) {
        polyIMCRef.current?.close();
        polyIMCRef.current = undefined;
      }
    };
  }, []);

  // Update the base handler map as editor context changes
  useEffect(() => {
    if (polyIMCRef.current) {
      polyIMCRef.current?.updateBaseReceiverHandlerMap(getHandlerMap());
    }
  }, [editorContext]);

  function markIMCInitialized(viewId: string) {
    imcInitializedMapRef.current.set(viewId, true);
    if (imcInitializedResolvePromisesRef.current[viewId]) {
      imcInitializedResolvePromisesRef.current[viewId]();
      delete imcInitializedResolvePromisesRef.current[viewId];
    }
  }

  async function resolveWhenViewInitialized(viewId: string) {
    return new Promise<void>((resolve) => {
      if (imcInitializedMapRef.current.get(viewId)) {
        resolve();
      } else {
        imcInitializedResolvePromisesRef.current[viewId] = resolve;
      }
    });
  }

  function markActionRegistered(action: Action) {
    actionRegisteredMapRef.current.set(action.name, true);
    if (actionRegisteredResolvePromisesRef.current[action.name]) {
      actionRegisteredResolvePromisesRef.current[action.name]();
      delete actionRegisteredResolvePromisesRef.current[action.name];
    }
  }

  async function resolveWhenActionRegistered(action: Action) {
    return new Promise<void>((resolve, reject) => {
      if (actionRegisteredMapRef.current.get(action.name)) {
        console.log(`Action "${action.name}" is already registered.`);
        resolve();
      } else {
        actionRegisteredResolvePromisesRef.current[action.name] = resolve;
      }
    });
  }

  function hasChannel(viewId: string) {
    if (!polyIMCRef.current) return false;
    return polyIMCRef.current.hasChannel(viewId);
  }

  function removeViewChannels(viewId: string) {
    if (!polyIMCRef.current) return;
    polyIMCRef.current.removeWindowChannels(viewId);
    imcInitializedMapRef.current.delete(viewId);
    delete imcInitializedResolvePromisesRef.current[viewId];
  }

  /**
   * Provide a map of handlers for the IMC messages used for Pulse Editor APIs.
   */
  function getHandlerMap() {
    const newMap = new Map<IMCMessageTypeEnum, ReceiverHandler>([
      [
        IMCMessageTypeEnum.EditorRunAgentMethod,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          if (!message.payload) {
            throw new Error("No agent method config provided.");
          }

          const {
            agentName,
            methodName,
            parameters,
            llmConfig,
          }: {
            agentName: string;
            methodName: string;
            parameters: Record<string, any>;
            llmConfig?: LLMConfig;
          } = message.payload;

          const agent = editorContext?.persistSettings?.extensionAgents?.find(
            (agent) => agent.name === agentName,
          );

          if (!agent) {
            throw new Error("Agent not found.");
          }

          const method = agent.availableMethods.find(
            (method) => method.name === methodName,
          );

          if (!method) {
            throw new Error("Agent method not found.");
          }

          const config = llmConfig
            ? llmConfig
            : method.LLMConfig
              ? method.LLMConfig
              : agent.LLMConfig
                ? agent.LLMConfig
                : undefined; // TODO: use editor level default config -- getDefaultLLMConfig();

          if (!config) {
            throw new Error("No LLM config found for this agent method.");
          }

          const provider = config.provider;

          const apiKey = getAPIKey(editorContext, provider);

          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const result = await runAgentMethodLocal(
            apiKey,
            config,
            agent,
            methodName,
            parameters,
            abortSignal,
          );

          return result;
        },
      ],
      [
        IMCMessageTypeEnum.ModalityVAD,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use voice message
          console.log("Received use voice message from extension:", message);
          throw new Error("Not implemented");
        },
      ],
      [
        IMCMessageTypeEnum.ModalitySTT,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use STT message
          console.log("Received use STT message from extension:", message);

          const {
            audio,
            sttConfig,
          }: { audio: ArrayBuffer; sttConfig?: STTConfig } = message.payload;

          const config = sttConfig ?? getDefaultSTTConfig(editorContext);

          if (!config) {
            throw new Error("No STT config found for this agent method.");
          }

          const provider = config.provider;
          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const stt = getSTTModel(apiKey, provider, config.modelName);
          if (!stt) {
            throw new Error("STT not found.");
          }

          const blob = new Blob([audio], { type: "audio/wav" });

          const result = await stt.generate(await blob.arrayBuffer());

          return result;
        },
      ],
      [
        IMCMessageTypeEnum.ModalityLLM,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use LLM message
          console.log("Received use LLM message from extension:", message);

          const {
            prompt,
            llmConfig,
          }: {
            prompt: string;
            llmConfig?: LLMConfig;
          } = message.payload;

          const config = llmConfig ?? getDefaultLLMConfig(editorContext);

          if (!config) {
            throw new Error("No LLM config found for this agent method.");
          }

          const provider = config.provider;

          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const llm = getLLMModel(
            apiKey,
            provider,
            config.modelName,
            config.temperature,
          );

          if (!llm) {
            throw new Error("LLM not found.");
          }

          const result = await llm.generate(prompt, abortSignal);

          return result;
        },
      ],
      [
        IMCMessageTypeEnum.ModalityTTS,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use TTS message
          console.log("Received use TTS message from extension:", message);

          const { text, ttsConfig }: { text: string; ttsConfig?: TTSConfig } =
            message.payload;

          const config = ttsConfig ?? getDefaultTTSConfig(editorContext);

          if (!config) {
            throw new Error("No TTS config found for this agent method.");
          }
          const provider = config.provider;

          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const tts = getTTSModel(
            apiKey,
            provider,
            config.modelName,
            config.voice,
          );
          if (!tts) {
            throw new Error("TTS not found.");
          }

          const result = await tts.generate(text);
          const arrayBuffer = await result.arrayBuffer();

          const int8Array = new Uint8Array(arrayBuffer);
          return int8Array;
        },
      ],
      [
        IMCMessageTypeEnum.ModalityImageGen,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use diffusion message
          console.log(
            `Received ${IMCMessageTypeEnum.ModalityImageGen.toString()} message from extension:`,
            message,
          );

          const {
            textPrompt,
            imagePrompt,
            imageModelConfig,
          }: {
            textPrompt?: string;
            imagePrompt?: string | ArrayBuffer;
            imageModelConfig?: ImageModelConfig;
          } = message.payload;

          const config =
            imageModelConfig ?? getDefaultImageModelConfig(editorContext);

          if (!config) {
            throw new Error(
              "No image model config found for this agent method.",
            );
          }

          const provider = config.provider;
          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const model = getImageGenModel(apiKey, provider, config.modelName);

          const res = await model.generate(textPrompt, imagePrompt);

          return res;
        },
      ],
      [
        IMCMessageTypeEnum.ModalityVideoGen,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use video generation message
          console.log(
            `Received ${IMCMessageTypeEnum.ModalityVideoGen.toString()} message from extension:`,
            message,
          );

          const {
            duration,
            textPrompt,
            imagePrompt,
            videoModelConfig,
          }: {
            duration: number;
            textPrompt?: string;
            imagePrompt?: string | ArrayBuffer;
            videoModelConfig?: ImageModelConfig;
          } = message.payload;

          const config =
            videoModelConfig ?? getDefaultVideoModelConfig(editorContext);

          if (!config) {
            throw new Error(
              "No video model config found for this agent method.",
            );
          }

          const provider = config.provider;
          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const model = getVideoGenModel(apiKey, provider, config.modelName);

          const res = await model.generate(duration, textPrompt, imagePrompt);

          return res;
        },
      ],
      [
        IMCMessageTypeEnum.ModalityOCR,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use OCR message
          console.log("Received use OCR message from extension:", message);

          const { image }: { image: string } = message.payload;

          const result = await recognizeText(image);

          return result;
        },
      ],
      [
        IMCMessageTypeEnum.ModalityMusicGen,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const {
            prompt,
            lyrics,
          }: {
            prompt?: string;
            lyrics?: string;
          } = message.payload;

          // const model = getMusicGenModel()
        },
      ],
      [
        IMCMessageTypeEnum.EditorGetEnv,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          return editorContext?.persistSettings?.envs ?? {};
        },
      ],
      [
        IMCMessageTypeEnum.EditorRegisterAction,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const action: Action = message.payload;
          if (!action.name) {
            throw new Error("Action must have a name.");
          }
          // Mark this action as registered
          markActionRegistered(action);
        },
      ],
      [
        IMCMessageTypeEnum.EditorAppRequestTheme,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          return resolvedTheme ?? "light";
        },
      ],
    ]);

    return newMap;
  }
  return (
    <IMCContext.Provider
      value={{
        polyIMC: polyIMCRef.current,
        resolveWhenViewInitialized,
        markIMCInitialized,
        resolveWhenActionRegistered,
        hasChannel,
        removeViewChannels,
      }}
    >
      {children}
    </IMCContext.Provider>
  );
}
