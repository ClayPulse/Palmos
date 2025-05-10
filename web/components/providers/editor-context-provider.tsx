"use client";

import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getModelLLM } from "@/lib/llm/llm";
import { decrypt } from "@/lib/security/simple-password";
import { getModelSTT } from "@/lib/stt/stt";
import { getModelTTS } from "@/lib/tts/tts";
import {
  EditorStates,
  EditorContextType,
  PersistentSettings,
  AIModels,
} from "@/lib/types";
import React, { createContext, useEffect, useState } from "react";

export const EditorContext = createContext<EditorContextType | undefined>(
  undefined,
);

const defaultEditorStates: EditorStates = {
  isDrawing: false,
  isDrawHulls: true,
  isDownloadClip: false,
  isInlineChatEnabled: false,
  isChatViewOpen: false,
  isLoadingRecorder: false,
  isRecording: false,
  isListening: false,
  isThinking: false,
  isSpeaking: false,
  inputAudioStream: undefined,
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
      settings?.sttProvider &&
      settings?.sttModel &&
      settings.apiKeys?.[settings?.sttProvider]
    ) {
      const model = getModelSTT(
        settings.apiKeys?.[settings?.sttProvider],
        settings?.sttProvider,
        settings?.sttModel,
      );

      const aiModels: AIModels = {
        ...editorStates.aiModels,
        sttModel: model,
      };

      setEditorStates((prev) => ({
        ...prev,
        aiModels: aiModels,
      }));
    }
  }, [
    editorStates.password,
    settings?.apiKeys,
    settings?.sttProvider,
    settings?.sttModel,
  ]);

  // Load LLM
  useEffect(() => {
    if (
      !editorStates.password &&
      settings?.llmProvider &&
      settings?.llmModel &&
      settings.apiKeys?.[settings?.llmProvider]
    ) {
      const model = getModelLLM(
        settings.apiKeys?.[settings?.llmProvider],
        settings?.llmProvider,
        settings?.llmModel,
        0.85,
      );

      const aiModels: AIModels = {
        ...editorStates.aiModels,
        llmModel: model,
      };

      setEditorStates((prev) => ({
        ...prev,
        aiModels: aiModels,
      }));
    }
  }, [
    editorStates.password,
    settings?.apiKeys,
    settings?.llmProvider,
    settings?.llmModel,
  ]);

  // Load TTS
  useEffect(() => {
    if (
      !editorStates.password &&
      settings?.ttsProvider &&
      settings?.ttsModel &&
      settings?.ttsVoice &&
      settings.apiKeys?.[settings?.ttsProvider]
    ) {
      const model = getModelTTS(
        settings.apiKeys?.[settings?.ttsProvider],
        settings?.ttsProvider,
        settings?.ttsModel,
        settings?.ttsVoice,
      );

      const aiModels: AIModels = {
        ...editorStates.aiModels,
        ttsModel: model,
      };

      setEditorStates((prev) => ({
        ...prev,
        aiModels: aiModels,
      }));
    }
  }, [
    editorStates.password,
    settings?.apiKeys,
    settings?.ttsProvider,
    settings?.ttsModel,
    settings?.ttsVoice,
  ]);

  // Load API keys when password is entered
  useEffect(() => {
    if (editorStates.password && settings?.isPasswordSet) {
      if (
        settings?.sttProvider &&
        settings?.sttModel &&
        settings.apiKeys?.[settings?.sttProvider]
      ) {
        const decryptedSTTAPIKey = decrypt(
          settings.apiKeys?.[settings?.sttProvider],
          editorStates.password,
        );

        const model = getModelSTT(
          decryptedSTTAPIKey,
          settings?.sttProvider,
          settings?.sttModel,
        );

        const aiModels: AIModels = {
          ...editorStates.aiModels,
          sttModel: model,
        };

        setEditorStates((prev) => ({
          ...prev,
          aiModels: aiModels,
        }));
      }

      if (
        settings?.llmProvider &&
        settings?.llmModel &&
        settings.apiKeys?.[settings?.llmProvider]
      ) {
        const decryptedLLMAPIKey = decrypt(
          settings.apiKeys?.[settings?.llmProvider],
          editorStates.password,
        );

        const model = getModelLLM(
          decryptedLLMAPIKey,
          settings?.llmProvider,
          settings?.llmModel,
          0.85,
        );

        const aiModels: AIModels = {
          ...editorStates.aiModels,
          llmModel: model,
        };

        setEditorStates((prev) => ({
          ...prev,
          aiModels: aiModels,
        }));
      }

      if (
        settings?.ttsProvider &&
        settings?.ttsModel &&
        settings?.ttsVoice &&
        settings.apiKeys?.[settings?.ttsProvider]
      ) {
        const decryptedTTSAPIKey = decrypt(
          settings.apiKeys?.[settings?.ttsProvider],
          editorStates.password,
        );

        const model = getModelTTS(
          decryptedTTSAPIKey,
          settings?.ttsProvider,
          settings?.ttsModel,
          settings?.ttsVoice,
        );

        const aiModels: AIModels = {
          ...editorStates.aiModels,
          ttsModel: model,
        };

        setEditorStates((prev) => ({
          ...prev,
          aiModels: aiModels,
        }));
      }
    }
  }, [
    editorStates.password,

    settings?.sttProvider,
    settings?.sttModel,

    settings?.llmProvider,
    settings?.llmModel,

    settings?.ttsProvider,
    settings?.ttsModel,
    settings?.ttsVoice,

    settings?.apiKeys,
  ]);

  return (
    <EditorContext.Provider
      value={{
        editorStates,
        setEditorStates,
        persistSettings: settings,
        setPersistSettings: setSettings,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
