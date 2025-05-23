import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import { useMicVAD, utils } from "@/lib/hooks/use-mic-vad";

export default function Voice() {
  const editorContext = useContext(EditorContext);

  return <>{editorContext?.editorStates.isRecording && <VADWrapper />}</>;
}

function VADWrapper() {
  const editorContext = useContext(EditorContext);
  // TODO: Use a timer to stop recorder if no speech is detected for more than 30 seconds

  const vad = useMicVAD({
    startOnLoad: false,
    baseAssetPath: "/vad/",
    onnxWASMBasePath: "/vad/",
    positiveSpeechThreshold: 0.75,
    onSpeechStart: () => {
      console.log("Speech started");
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isListening: true,
        inputAudioStream: undefined,
      }));
    },
    onSpeechEnd: (audio) => {
      console.log("Speech ended", audio);

      const wavArrayBuffer = utils.encodeWAV(audio);

      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isListening: false,
        isRecording: false,
        inputAudioStream: wavArrayBuffer,
      }));
    },
  });

  const [startedLoading, setStartedLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (vad.loading) {
      setStartedLoading(true);
    } else if (!vad.loading && startedLoading) {
      setStartedLoading(false);
      setIsLoaded(true);
    }
  }, [vad]);

  useEffect(() => {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isLoadingRecorder: !isLoaded,
    }));
  }, [isLoaded]);

  // Toggle recording
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (editorContext?.editorStates?.isRecording) {
      vad.start();
    } else {
      vad.stop();
    }
  }, [editorContext?.editorStates.isRecording, isLoaded]);

  return <></>;
}
