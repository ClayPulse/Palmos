import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useRef } from "react";

export default function useRecorder() {
  const editorContext = useContext(EditorContext);

  const isRecording = editorContext?.editorStates.isRecording ?? false;
  const isListening = editorContext?.editorStates.isListening ?? false;
  const inputDeviceBuffers = editorContext?.editorStates.inputDeviceBuffers;

  const recordVADPromiseRef = useRef<{
    resolve: (value: ArrayBuffer) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  useEffect(() => {
    if (!isRecording && !isListening && inputDeviceBuffers?.audioBuffer) {
      // Finish the recording promise
      if (recordVADPromiseRef.current) {
        recordVADPromiseRef.current.resolve(inputDeviceBuffers.audioBuffer);
        recordVADPromiseRef.current = null;
        // Clear the audio buffer
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          inputDeviceBuffers: {
            audioBuffer: undefined,
          },
        }));
      }
    }
  }, [isRecording, isListening, inputDeviceBuffers]);

  /**
   * Start recording using VAD
   * @returns The result of VAD recording
   */
  async function recordVAD(): Promise<ArrayBuffer> {
    if (isRecording) {
      throw new Error("Already recording");
    }
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isRecording: true,
      isLoadingRecorder: true,
    }));

    return new Promise<ArrayBuffer>((resolve, reject) => {
      recordVADPromiseRef.current = { resolve, reject };
    });
  }

  function stopRecording() {
    if (!isRecording) {
      return;
    }
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isRecording: false,
    }));
  }

  return {
    isRecording,
    recordVAD,
    stopRecording,
  };
}
