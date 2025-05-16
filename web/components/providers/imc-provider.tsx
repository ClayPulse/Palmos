"use client";

import { IMCContextType, PlatformEnum } from "@/lib/types";
import {
  IMCMessage,
  IMCMessageTypeEnum,
  LLMConfig,
  PolyIMC,
  STTConfig,
  TTSConfig,
} from "@pulse-editor/shared-utils";
import { createContext, useContext, useEffect, useState } from "react";
import { EditorContext } from "./editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getAPIKey } from "@/lib/settings/settings";
import { runAgentMethod } from "@/lib/agent/agent-runner";
import { getModelLLM } from "@/lib/llm/llm";
import { getModelTTS } from "@/lib/tts/tts";
import { getModelSTT } from "@/lib/stt/stt";
import { recognizeText } from "@/lib/image-processing/ocr";

export const IMCContext = createContext<IMCContextType | undefined>(undefined);

export default function InterModuleCommunicationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [polyIMC, setPolyIMC] = useState<PolyIMC | undefined>(undefined);

  const editorContext = useContext(EditorContext);
  const { platformApi } = usePlatformApi();

  useEffect(() => {
    // @ts-expect-error set window viewId
    window.viewId = "Pulse Editor Main";
  }, []);

  useEffect(() => {
    if (!polyIMC) {
      const newPolyIMC = new PolyIMC(getHandlerMap());
      setPolyIMC(newPolyIMC);
    }
  }, [polyIMC, setPolyIMC]);

  // Update the base handler map as editor context changes
  useEffect(() => {
    if (polyIMC) {
      polyIMC.updateBaseReceiverHandlerMap(getHandlerMap());
    }
  }, [polyIMC, editorContext]);

  /**
   * Provide a map of handlers for the IMC messages used for Pulse Editor APIs.
   */
  function getHandlerMap() {
    const newMap = new Map<
      IMCMessageTypeEnum,
      {
        (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ): Promise<any>;
      }
    >([
      [
        IMCMessageTypeEnum.RunAgentMethod,
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

          const result = await runAgentMethod(
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
        IMCMessageTypeEnum.RequestTerminal,
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
            };
          } else {
            const wsUrl = await platformApi?.createTerminal();
            return {
              websocketUrl: wsUrl,
            };
          }
        },
      ],
      [
        IMCMessageTypeEnum.UseVAD,
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
        IMCMessageTypeEnum.UseSTT,
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

          const config = sttConfig ? sttConfig : undefined; // TODO: use editor level default config -- getDefaultLLMConfig();
          if (!config) {
            throw new Error("No STT config found for this agent method.");
          }

          const provider = config.provider;
          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const stt = getModelSTT(apiKey, provider, config.modelName);
          if (!stt) {
            throw new Error("STT not found.");
          }

          const blob = new Blob([audio], { type: "audio/wav" });

          const result = await stt.generate(await blob.arrayBuffer());

          return result;
        },
      ],
      [
        IMCMessageTypeEnum.UseLLM,
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

          const config = llmConfig ? llmConfig : undefined; // TODO: use editor level default config -- getDefaultLLMConfig();

          if (!config) {
            throw new Error("No LLM config found for this agent method.");
          }

          const provider = config.provider;

          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const llm = getModelLLM(
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
        IMCMessageTypeEnum.UseTTS,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use TTS message
          console.log("Received use TTS message from extension:", message);

          const { text, ttsConfig }: { text: string; ttsConfig?: TTSConfig } =
            message.payload;

          const config = ttsConfig ? ttsConfig : undefined; // TODO: use editor level default config -- getDefaultLLMConfig();

          if (!config) {
            throw new Error("No TTS config found for this agent method.");
          }
          const provider = config.provider;

          const apiKey = getAPIKey(editorContext, provider);
          if (!apiKey) {
            throw new Error(`No API key found for provider ${provider}.`);
          }

          const tts = getModelTTS(
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
        IMCMessageTypeEnum.UseDiffusion,
        async (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ) => {
          // Handle the use diffusion message
          console.log(
            "Received use diffusion message from extension:",
            message,
          );

          throw new Error("Not implemented");
        },
      ],
      [
        IMCMessageTypeEnum.UseOCR,
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
    ]);

    return newMap;
  }

  return (
    <IMCContext.Provider
      value={{
        polyIMC,
      }}
    >
      {children}
    </IMCContext.Provider>
  );
}
