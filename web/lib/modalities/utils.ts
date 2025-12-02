import {
  ImageModelConfig,
  LLMModelConfig,
  STTModelConfig,
  TTSModelConfig,
  VideoModelConfig,
} from "@pulse-editor/shared-utils";
import { EditorContextType } from "../types";

export function getDefaultSTTConfig(
  editorContext: EditorContextType | undefined,
): STTModelConfig | undefined {
  if (
    editorContext?.persistSettings?.sttModel &&
    editorContext?.persistSettings?.sttProvider
  ) {
    return {
      modelId: `${editorContext.persistSettings.sttProvider}/${editorContext.persistSettings.sttModel}`,
    };
  }
}

export function getDefaultLLMConfig(
  editorContext: EditorContextType | undefined,
): LLMModelConfig | undefined {
  if (
    editorContext?.persistSettings?.llmModel &&
    editorContext?.persistSettings?.llmProvider
  ) {
    return {
      modelId: `${editorContext.persistSettings.llmProvider}/${editorContext.persistSettings.llmModel}`,
      temperature: 1,
    };
  }
}

export function getDefaultTTSConfig(
  editorContext: EditorContextType | undefined,
): TTSModelConfig | undefined {
  if (
    editorContext?.persistSettings?.ttsModel &&
    editorContext?.persistSettings?.ttsProvider &&
    editorContext?.persistSettings?.ttsVoice
  ) {
    return {
      modelId: `${editorContext.persistSettings.ttsProvider}/${editorContext.persistSettings.ttsModel}`,
      voiceName: editorContext.persistSettings.ttsVoice,
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
      modelId: `${editorContext.persistSettings.imageGenProvider}/${editorContext.persistSettings.imageGenModel}`,
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
      modelId: `${editorContext.persistSettings.videoGenProvider}/${editorContext.persistSettings.videoGenModel}`,
    };
  }
}
