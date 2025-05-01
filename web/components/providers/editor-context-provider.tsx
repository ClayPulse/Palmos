"use client";

import { AIModelConfig } from "@/lib/ai-model-config";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getModelLLM } from "@/lib/llm/llm";
import { decrypt } from "@/lib/security/simple-password";
import { getModelSTT } from "@/lib/stt/stt";
import { getModelTTS } from "@/lib/tts/tts";
import {
  EditorStates,
  EditorContextType,
  PersistentSettings,
} from "@/lib/types";
import React, { createContext, useEffect, useRef, useState } from "react";

export const EditorContext = createContext<EditorContextType | undefined>(
  undefined,
);

const defaultEditorStates: EditorStates = {
  isDrawing: false,
  isDrawHulls: true,
  isDownloadClip: false,
  isInlineChatEnabled: false,
  isChatViewOpen: false,
  isRecording: false,
  isListening: false,
  isThinking: false,
  isSpeaking: false,
  isMuted: false,
  isToolbarOpen: true,
  explorerSelectedNodeRefs: [],
  pressedKeys: [],
  openedViewModels: [],
  viewIds: [],
};

export default function EditorContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- Editor States ---
  const [editorStates, setEditorStates] =
    useState<EditorStates>(defaultEditorStates);

  // --- Persist Settings ---
  // Persist settings are loaded from local storage upon component mount
  const [settings, setSettings] = useState<PersistentSettings | undefined>(
    undefined,
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // --- AI Model Management ---
  const aiModelConfig = useRef<AIModelConfig>(new AIModelConfig());

  // --- Platform API ---
  const { platformApi } = usePlatformApi();

  // Track all pressed keys
  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      setEditorStates((prev) => {
        // Prevent duplicate keys
        if (!prev.pressedKeys.includes(e.key)) {
          return {
            ...prev,
            pressedKeys: [...prev.pressedKeys, e.key],
          };
        }

        return prev;
      });
    });

    window.addEventListener("keyup", (e) => {
      setEditorStates((prev) => ({
        ...prev,
        pressedKeys: prev.pressedKeys.filter((key) => key !== e.key),
      }));
    });

    return () => {
      window.removeEventListener("keydown", () => {});
      window.removeEventListener("keyup", () => {});
    };
  }, []);

  // Load settings from local storage
  useEffect(() => {
    if (platformApi) {
      platformApi
        ?.getPersistentSettings()
        .then((loadedSettings: PersistentSettings) => {
          setSettings(loadedSettings);
          setIsSettingsLoaded(true);
        });
    }
  }, [platformApi]);

  // Save settings to local storage
  useEffect(() => {
    if (isSettingsLoaded) {
      if (settings) {
        platformApi?.setPersistentSettings(settings);
      } else {
        platformApi?.resetPersistentSettings();
      }
    }
  }, [settings]);

  // Load STT
  useEffect(() => {
    if (
      !editorStates.password &&
      settings?.sttAPIKey &&
      settings?.sttProvider &&
      settings?.sttModel
    ) {
      const model = getModelSTT(
        settings.sttAPIKey,
        settings?.sttProvider,
        settings?.sttModel,
      );
      aiModelConfig.current.setSTTModel(model);
    }
  }, [
    editorStates.password,
    settings?.sttAPIKey,
    settings?.sttProvider,
    settings?.sttModel,
  ]);

  // Load LLM
  useEffect(() => {
    if (
      !editorStates.password &&
      settings?.llmAPIKey &&
      settings?.llmProvider &&
      settings?.llmModel
    ) {
      const model = getModelLLM(
        settings.llmAPIKey,
        settings?.llmProvider,
        settings?.llmModel,
        0.85,
      );
      aiModelConfig.current.setLLMModel(model);
    }
  }, [
    editorStates.password,
    settings?.llmAPIKey,
    settings?.llmProvider,
    settings?.llmModel,
  ]);

  // Load TTS
  useEffect(() => {
    if (
      !editorStates.password &&
      settings?.ttsAPIKey &&
      settings?.ttsProvider &&
      settings?.ttsModel &&
      settings?.ttsVoice
    ) {
      const model = getModelTTS(
        settings.ttsAPIKey,
        settings?.ttsProvider,
        settings?.ttsModel,
        settings?.ttsVoice,
      );
      aiModelConfig.current.setTTSModel(model);
    }
  }, [
    editorStates.password,
    settings?.ttsAPIKey,
    settings?.ttsProvider,
    settings?.ttsModel,
    settings?.ttsVoice,
  ]);

  // Load API keys when password is entered
  useEffect(() => {
    if (editorStates.password && settings?.isPasswordSet) {
      if (settings?.sttAPIKey && settings?.sttProvider && settings?.sttModel) {
        const decryptedSTTAPIKey = decrypt(
          settings.sttAPIKey,
          editorStates.password,
        );

        const model = getModelSTT(
          decryptedSTTAPIKey,
          settings?.sttProvider,
          settings?.sttModel,
        );
        aiModelConfig.current.setSTTModel(model);

        console.log("decryptedSTTAPIKey", decryptedSTTAPIKey);
      }

      if (settings?.llmAPIKey && settings?.llmProvider && settings?.llmModel) {
        const decryptedLLMAPIKey = decrypt(
          settings.llmAPIKey,
          editorStates.password,
        );

        const model = getModelLLM(
          decryptedLLMAPIKey,
          settings?.llmProvider,
          settings?.llmModel,
          0.85,
        );
        aiModelConfig.current.setLLMModel(model);

        console.log("decryptedLLMAPIKey", decryptedLLMAPIKey);
      }

      if (
        settings?.ttsAPIKey &&
        settings?.ttsProvider &&
        settings?.ttsModel &&
        settings?.ttsVoice
      ) {
        const decryptedTTSAPIKey = decrypt(
          settings.ttsAPIKey,
          editorStates.password,
        );

        const model = getModelTTS(
          decryptedTTSAPIKey,
          settings?.ttsProvider,
          settings?.ttsModel,
          settings?.ttsVoice,
        );
        aiModelConfig.current.setTTSModel(model);

        console.log("decryptedTTSAPIKey", decryptedTTSAPIKey);
      }
    }
  }, [
    editorStates.password,

    settings?.sttAPIKey,
    settings?.sttProvider,
    settings?.sttModel,

    settings?.llmAPIKey,
    settings?.llmProvider,
    settings?.llmModel,

    settings?.ttsAPIKey,
    settings?.ttsProvider,
    settings?.ttsModel,
    settings?.ttsVoice,
  ]);

  return (
    <EditorContext.Provider
      value={{
        editorStates,
        setEditorStates,
        persistSettings: settings,
        setPersistSettings: setSettings,
        aiModelConfig: aiModelConfig.current,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
