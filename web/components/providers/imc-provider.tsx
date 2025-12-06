"use client";

import { LLMAgentRunner } from "@/lib/agent/runners/llm-agent-runner";
import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getImageGenModel } from "@/lib/modalities/image-gen/get-image-gen";
import { getLLMModel } from "@/lib/modalities/llm/get-llm";
import { recognizeText } from "@/lib/modalities/ocr/ocr";
import { getSTTModel } from "@/lib/modalities/stt/get-stt";
import { getTTSModel } from "@/lib/modalities/tts/get-tts";
import {
  getDefaultImageModelConfig,
  getDefaultLLMConfig,
  getDefaultSTTConfig,
  getDefaultTTSConfig,
  getDefaultVideoModelConfig,
} from "@/lib/modalities/utils";
import { getVideoGenModel } from "@/lib/modalities/video-gen/get-video-gen";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { getAPIKey } from "@/lib/settings/api-manager-utils";
import { IMCContextType } from "@/lib/types";
import {
  Action,
  ImageModelConfig,
  IMCMessage,
  IMCMessageTypeEnum,
  ListPathOptions,
  LLMModelConfig,
  PolyIMC,
  ReceiverHandler,
  STTModelConfig,
  TTSModelConfig,
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
  const { platformApi } = usePlatformApi();
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
            args,
            llmConfig,
          }: {
            agentName: string;
            methodName: string;
            args: Record<string, any>;
            llmConfig?: LLMModelConfig;
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

          const modelId = llmConfig
            ? `${llmConfig.modelId}`
            : method.LLMConfig
              ? `${method.LLMConfig.modelId}`
              : agent.LLMConfig
                ? `${agent.LLMConfig?.modelId}`
                : "pulse-editor/pulse-ai-v1-turbo";

          if (!modelId) {
            throw new Error("No model ID found for this agent method.");
          }

          const apiKey = getAPIKey(editorContext, llmConfig?.modelId);

          const runner = new LLMAgentRunner();

          const result = await runner.run(
            {
              modelId,
              apiKey,
              temperature: llmConfig?.temperature,
            },
            agent,
            methodName,
            args,
          );

          return JSON.parse(result);
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
          }: { audio: ArrayBuffer; sttConfig?: STTModelConfig } =
            message.payload;

          const config = sttConfig ?? getDefaultSTTConfig(editorContext);

          if (!config) {
            throw new Error("No STT config found for this agent method.");
          }

          const apiKey = getAPIKey(editorContext, config.modelId);

          const stt = getSTTModel({
            apiKey: apiKey,
            modelId: `${config.modelId}`,
            temperature: config.temperature,
          });
          if (!stt) {
            throw new Error("STT not found.");
          }

          const blob = new Blob([audio], { type: "audio/wav" });

          const result = await stt.generateStream(await blob.arrayBuffer());

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
            llmConfig?: LLMModelConfig;
          } = message.payload;

          const config = llmConfig ?? getDefaultLLMConfig(editorContext);

          if (!config) {
            throw new Error("No LLM config found for this agent method.");
          }

          const apiKey = getAPIKey(editorContext, config.modelId);

          const llm = getLLMModel({
            modelId: `${config.modelId}`,
            apiKey: apiKey,
            temperature: config.temperature,
          });

          if (!llm) {
            throw new Error("LLM not found.");
          }

          const result = await llm.generateStream(prompt, abortSignal);

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

          const {
            text,
            ttsConfig,
          }: { text: string; ttsConfig?: TTSModelConfig } = message.payload;

          const config = ttsConfig ?? getDefaultTTSConfig(editorContext);

          if (!config) {
            throw new Error("No TTS config found for this agent method.");
          }

          const apiKey = getAPIKey(editorContext, config.modelId);

          const tts = getTTSModel({
            modelId: `${config.modelId}`,
            apiKey: apiKey,
            temperature: config.temperature,
            voiceName: config.voiceName,
          });
          if (!tts) {
            throw new Error("TTS not found.");
          }

          const result = await tts.generateStream(text);

          return result;
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

          const apiKey = getAPIKey(editorContext, config.modelId);

          const model = getImageGenModel({
            modelId: config.modelId,
            apiKey: apiKey,
          });

          if (!model) {
            throw new Error("Image generation model not found.");
          }

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

          const apiKey = getAPIKey(editorContext, config.modelId);

          const model = getVideoGenModel({
            modelId: config.modelId,
            apiKey: apiKey,
          });

          if (!model) {
            throw new Error("Video generation model not found.");
          }

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
      [
        IMCMessageTypeEnum.EditorAppUseOwnedApp,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use owned app action
          const {
            viewId,
            actionName,
            args,
          }: { viewId: string; actionName: string; args: any } =
            message.payload;

          const result =
            (await polyIMCRef.current?.sendMessage(
              viewId,
              IMCMessageTypeEnum.EditorRunAppAction,
              { name: actionName, args },
            )) ?? [];

          if (result.length !== 1) {
            console.error(
              `Expected single result from owned app view ${viewId} for action ${actionName}, but got:`,
              result,
            );
          }
          return result[0];
        },
      ],
      [
        IMCMessageTypeEnum.EditorAppRequestWorkspace,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          return {
            id: editorContext?.editorStates.currentWorkspace?.id,
          };
        },
      ],
      // The following message handlers require OS-like environment.
      // This can be either local environment or remote workspace.
      [
        IMCMessageTypeEnum.PlatformListPath,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { uri, options }: { uri: string; options: ListPathOptions } =
            message.payload;
          const result = await platformApi?.listPathContent(uri, options);
          return result ?? [];
        },
      ],
      [
        IMCMessageTypeEnum.PlatformCreateFolder,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { uri }: { uri: string } = message.payload;
          await platformApi?.createFolder(uri);
        },
      ],
      [
        IMCMessageTypeEnum.PlatformCreateFile,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { uri }: { uri: string } = message.payload;
          await platformApi?.createFile(uri);
        },
      ],
      [
        IMCMessageTypeEnum.PlatformRename,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { oldUri, newUri }: { oldUri: string; newUri: string } =
            message.payload;
          await platformApi?.rename(oldUri, newUri);
        },
      ],
      [
        IMCMessageTypeEnum.PlatformDelete,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { uri }: { uri: string } = message.payload;
          await platformApi?.delete(uri);
        },
      ],
      [
        IMCMessageTypeEnum.PlatformHasPath,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { uri }: { uri: string } = message.payload;
          const exists = await platformApi?.hasPath(uri);
          return !!exists;
        },
      ],
      [
        IMCMessageTypeEnum.PlatformCopyFiles,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { from, to }: { from: string; to: string } = message.payload;
          await platformApi?.copyFiles(from, to);
        },
      ],
      [
        IMCMessageTypeEnum.PlatformWriteFile,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          if (message.payload) {
            const { uri, file }: { uri: string; file: File | undefined } =
              message.payload;

            if (!file) {
              throw new Error("File is undefined.");
            }

            const projectPath =
              editorContext?.persistSettings?.projectHomePath +
              "/" +
              editorContext?.editorStates.project;

            // Prevent writing to path outside the project path
            if (!uri.startsWith(projectPath)) {
              throw new Error(
                "Cannot write to path outside the project directory.",
              );
            }
            await platformApi?.writeFile(file, uri);
          }
        },
      ],
      [
        IMCMessageTypeEnum.PlatformReadFile,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const { uri }: { uri: string } = message.payload;

          const projectPath =
            editorContext?.persistSettings?.projectHomePath +
            "/" +
            editorContext?.editorStates.project;

          // Prevent reading path outside the project path
          if (!uri.startsWith(projectPath)) {
            throw new Error(
              `Cannot read file outside the project directory: ${uri}, project path: ${projectPath}`,
            );
          }

          const file = await platformApi?.readFile(uri);
          return file;
        },
      ],
      [
        IMCMessageTypeEnum.PlatformCreateTerminal,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          const platform = getPlatform();
          // Get a shell terminal from native platform APIs
          if (platform === PlatformEnum.Capacitor) {
            return {
              websocketUrl: editorContext?.persistSettings?.mobileHost,
              projectHomePath: `~/storage/shared/${editorContext?.persistSettings?.projectHomePath}`,
            };
          } else {
            const wsUrl = await platformApi?.createTerminal();
            return {
              websocketUrl: wsUrl,
              projectHomePath: editorContext?.persistSettings?.projectHomePath,
            };
          }
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
