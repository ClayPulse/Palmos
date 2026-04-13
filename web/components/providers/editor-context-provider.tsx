"use client";

import { AppModeEnum } from "@/lib/enums";
import { useAuth } from "@/lib/hooks/use-auth";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { getLLMModel } from "@/lib/modalities/llm/get-llm";
import { getSTTModel } from "@/lib/modalities/stt/get-stt";
import { getTTSModel } from "@/lib/modalities/tts/get-tts";
import { decrypt } from "@/lib/security/simple-password";
import {
  AIModels,
  EditorContextType,
  EditorStates,
  ModalStates,
  PersistentSettings,
} from "@/lib/types";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

export const EditorContext = createContext<EditorContextType | undefined>(
  undefined,
);

const defaultEditorStates: EditorStates = {
  isDrawing: false,
  isDrawHulls: true,
  isDownloadClip: false,
  isInlineChatEnabled: false,
  isConsolePanelOpen: false,
  isChatPanelOpen: false,
  appMode: AppModeEnum.Agent,
  isLoadingRecorder: false,
  isRecording: false,
  isListening: false,
  isThinking: false,
  isSpeaking: false,
  isToolbarOpen: true,
  explorerSelectedNodeRefs: [],
  pressedKeys: [],
  tabViews: [],
  tabIndex: -1,
  workflowEdges: [],
  workflowNodes: [],
};

const defaultPersistSettings: PersistentSettings = {
  assistantChatModelConfig: {
    sts: {
      modelId: "pulse-editor/pulse-ai-v1-turbo",
    },
  },
};

export default function EditorContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- Platform API ---
  const { platformApi } = usePlatformApi();
  const { session } = useAuth();

  // --- Editor States ---
  const [editorStates, setEditorStates] =
    useState<EditorStates>(defaultEditorStates);

  // --- Persist Settings ---
  // Persist settings are loaded from local storage upon component mount
  const [settings, setSettings] = useState<PersistentSettings | undefined>(
    undefined,
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

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

  // Load settings (only once — guard prevents session ref changes from re-fetching)
  useEffect(() => {
    if (platformApi && session && !isSettingsLoaded) {
      platformApi
        ?.getPersistentSettings()
        .then((loadedSettings: PersistentSettings) => {
          if (loadedSettings.lastProject) {
            setEditorStates((prev) => ({
              ...prev,
              project: loadedSettings.lastProject ?? "",
            }));
          }
          setSettings(loadedSettings);
          setIsSettingsLoaded(true);
        });
    }
  }, [platformApi, session]);

  // Load projects from cloud
  useEffect(() => {
    if (session) {
      fetchAPI("/api/project/list")
        .then((res) => (res.ok ? res.json() : []))
        .then((data: any[]) => {
          const projectsInfo = data.map((proj: any) => ({
            id: proj.id,
            name: proj.name,
            ctime: new Date(proj.createdAt),
            role: proj.role,
            memberCount: proj.memberCount,
          }));
          setEditorStates((prev) => ({ ...prev, projectsInfo }));
        })
        .catch(() => {});
    }
  }, [session]);

  // Save settings (debounced to prevent rapid overwrites)
  useEffect(() => {
    if (!isSettingsLoaded || !session) return;
    const timer = setTimeout(() => {
      if (settings) {
        platformApi?.setPersistentSettings(settings);
      } else {
        platformApi?.resetPersistentSettings();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, session, isSettingsLoaded]);

  // Persist active project to settings
  const isProjectInitialized = useRef(false);
  useEffect(() => {
    if (!isSettingsLoaded) return;
    // Skip the first run — that's the restored value, not a user change
    if (!isProjectInitialized.current) {
      isProjectInitialized.current = true;
      return;
    }
    setSettings((prev) =>
      prev ? { ...prev, lastProject: editorStates.project || undefined } : prev,
    );
  }, [editorStates.project, isSettingsLoaded]);

  // Load STT
  useEffect(() => {
    if (
      !editorStates.password &&
      settings?.sttProvider &&
      settings?.sttModel &&
      settings.apiKeys?.[settings?.sttProvider]
    ) {
      const model = getSTTModel({
        apiKey: settings.apiKeys?.[settings?.sttProvider],
        modelId: `${settings?.sttProvider}/${settings?.sttModel}`,
      });

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
      const model = getLLMModel({
        apiKey: settings.apiKeys?.[settings?.llmProvider],
        modelId: `${settings?.llmProvider}/${settings?.llmModel}`,
        temperature: 0.85,
      });

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
      const model = getTTSModel({
        apiKey: settings.apiKeys?.[settings?.ttsProvider],
        modelId: `${settings?.ttsProvider}/${settings?.ttsModel}`,
        voiceName: settings?.ttsVoice,
      });

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

        const model = getSTTModel({
          apiKey: decryptedSTTAPIKey,
          modelId: `${settings?.sttProvider}/${settings?.sttModel}`,
        });

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

        const model = getLLMModel({
          apiKey: decryptedLLMAPIKey,
          modelId: `${settings?.llmProvider}/${settings?.llmModel}`,
          temperature: 0.85,
        });

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

        const model = getTTSModel({
          apiKey: decryptedTTSAPIKey,
          modelId: `${settings?.ttsProvider}/${settings?.ttsModel}`,
          voiceName: settings?.ttsVoice,
        });

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

  const updateModalStates: Dispatch<SetStateAction<ModalStates | undefined>> = (
    patchedState,
  ) => {
    setEditorStates((prevStates) => ({
      ...prevStates,
      modalStates: {
        ...prevStates.modalStates,
        ...patchedState,
      },
    }));
  };

  return (
    <EditorContext.Provider
      value={{
        editorStates,
        setEditorStates,
        persistSettings: settings,
        setPersistSettings: setSettings,
        updateModalStates,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
