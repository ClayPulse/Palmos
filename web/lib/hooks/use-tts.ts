import { useContext, useEffect, useState } from "react";
import { BaseTTS, getTTSModel } from "../modalities/tts/tts";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { getAPIKey } from "../settings/settings";

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
    const tts = getTTSModel(ttsKey, ttsProvider, ttsModel, ttsVoice);
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

    const audio = await ttsModel.generate(text);
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
