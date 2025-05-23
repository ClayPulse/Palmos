import {
  ImageModelConfig,
  LLMConfig,
  STTConfig,
  TTSConfig,
  VideoModelConfig,
} from "@pulse-editor/shared-utils";
import { EditorContextType } from "../types";

export function getDefaultSTTConfig(
  editorContext: EditorContextType | undefined,
): STTConfig | undefined {
  if (
    editorContext?.persistSettings?.sttModel &&
    editorContext?.persistSettings?.sttProvider
  ) {
    return {
      modelName: editorContext.persistSettings.sttModel,
      provider: editorContext.persistSettings.sttProvider,
    };
  }
}

export function getDefaultLLMConfig(
  editorContext: EditorContextType | undefined,
): LLMConfig | undefined {
  if (
    editorContext?.persistSettings?.llmModel &&
    editorContext?.persistSettings?.llmProvider
  ) {
    return {
      modelName: editorContext.persistSettings.llmModel,
      provider: editorContext.persistSettings.llmProvider,
      temperature: 0.95,
    };
  }
}

export function getDefaultTTSConfig(
  editorContext: EditorContextType | undefined,
): TTSConfig | undefined {
  if (
    editorContext?.persistSettings?.ttsModel &&
    editorContext?.persistSettings?.ttsProvider &&
    editorContext?.persistSettings?.ttsVoice
  ) {
    return {
      modelName: editorContext.persistSettings.ttsModel,
      provider: editorContext.persistSettings.ttsProvider,
      voice: editorContext.persistSettings.ttsVoice,
    };
  }
}

export function getDefaultImageModelConfig(
  editorContext: EditorContextType | undefined,
): ImageModelConfig | undefined {
  if (
    editorContext?.persistSettings?.imageGenModel &&
    editorContext?.persistSettings?.imageGenProvider
  ) {
    return {
      modelName: editorContext.persistSettings.imageGenModel,
      provider: editorContext.persistSettings.imageGenProvider,
    };
  }
}

export function getDefaultVideoModelConfig(
  editorContext: EditorContextType | undefined,
): VideoModelConfig | undefined {
  if (
    editorContext?.persistSettings?.videoGenModel &&
    editorContext?.persistSettings?.videoGenProvider
  ) {
    return {
      modelName: editorContext.persistSettings.videoGenModel,
      provider: editorContext.persistSettings.videoGenProvider,
    };
  }
}
