import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext } from "react";

export default function useRecorder() {
  const editorContext = useContext(EditorContext);

  const stream = editorContext?.editorStates.inputAudioStream;
  const isRecording = editorContext?.editorStates.isRecording ?? false;

  function startRecording() {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isRecording: true,
    }));
  }

  function record(): ReadableStream | undefined {
    if (isRecording) {
      throw new Error("Already recording");
    }
    startRecording();
    return stream;
  }

  return {
    isRecording,
    record,
  };
}
