import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useState } from "react";
import { BaseTTS } from "../modalities/tts/base-tts";
import { getTTSModel } from "../modalities/tts/get-tts";
import { getAPIKey } from "../settings/api-manager-utils";

export default function useTTS() {
  const editorContext = useContext(EditorContext);
  const [ttsModel, setTtsModel] = useState<BaseTTS | undefined>(undefined);

  // Load TTS model
  useEffect(() => {
    if (!editorContext?.persistSettings) {
      return;
    }

    const ttsKey = getAPIKey(
      editorContext,
      editorContext?.persistSettings?.ttsProvider,
    );
    const ttsProvider = editorContext?.persistSettings?.ttsProvider;
    const ttsModel = editorContext?.persistSettings?.ttsModel;
    const ttsVoice = editorContext?.persistSettings?.ttsVoice;

    if (!ttsKey || !ttsProvider || !ttsModel || !ttsVoice) {
      return;
    }
    const tts = getTTSModel({
      apiKey: ttsKey,
      modelId: `${ttsProvider}/${ttsModel}`,
      voiceName: ttsVoice,
    });
    if (tts) {
      setTtsModel(tts);
    } else {
      console.error("TTS model is not available.");
    }
  }, [editorContext?.persistSettings]);

  async function readText(text: string) {
    if (!ttsModel) {
      console.error("TTS model is not loaded.");
      return;
    }

    const audio = await ttsModel.generateStream(text);
    return audio;
  }

  async function playAudio(audio: Blob) {
    return new Promise<void>(async (resolve) => {
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      const audioBuffer = await audioContext.decodeAudioData(
        await audio.arrayBuffer(),
      );
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isSpeaking: true,
        isThinking: false,
        thinkingText: undefined,
      }));

      source.onended = () => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isSpeaking: false,
        }));
        resolve();
      };
    });
  }

  return { readText, playAudio };
}
