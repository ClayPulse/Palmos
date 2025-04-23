import { useContext, useEffect, useRef } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import { useViewManager } from "@/lib/hooks/use-view-manager";
import { useMicVAD, utils } from "@/lib/hooks/use-mic-vad";
import toast from "react-hot-toast";
import { CodeEditorAgent } from "@/lib/agents/code-editor-agent";
import { BaseSTT } from "@/lib/stt/stt";
import { BaseLLM } from "@/lib/llm/llm";
import { BaseTTS } from "@/lib/tts/tts";

export default function Voice() {
  const editorContext = useContext(EditorContext);
  const { updateFileView, activeFileView } = useViewManager();

  // TODO: Use a timer to stop recorder if no speech is detected for more than 30 seconds
  const isProcessingRef = useRef(false);
  const vad = useMicVAD({
    startOnLoad: false,
    baseAssetPath: "/vad/",
    onnxWASMBasePath: "/vad/",
    positiveSpeechThreshold: 0.75,
    onSpeechStart: () => {
      if (!isProcessingRef.current) {
        const sttModel = editorContext?.aiModelConfig.getSTTModel();
        const llmModel = editorContext?.aiModelConfig.getLLMModel();
        const ttsModel = editorContext?.aiModelConfig.getTTSModel();
        let isConfigured = true;
        if (!sttModel) {
          toast.error("STT model is not configured in settings.");
          isConfigured = false;
        }
        if (!llmModel) {
          toast.error("LLM model is not configured in settings.");
          isConfigured = false;
        }
        if (!ttsModel) {
          toast.error("TTS model is not configured in settings.");
          isConfigured = false;
        }

        if (!isConfigured) {
          return;
        }

        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isListening: true,
        }));
      }
    },
    onSpeechEnd: (audio) => {
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        const wavBuffer = utils.encodeWAV(audio);
        const blob = new Blob([wavBuffer], { type: "audio/wav" });
        console.log("Speech end\n", blob);

        const sttModel = editorContext?.aiModelConfig.getSTTModel() as BaseSTT;
        const llmModel = editorContext?.aiModelConfig.getLLMModel() as BaseLLM;
        const ttsModel = editorContext?.aiModelConfig.getTTSModel() as BaseTTS;

        const agent = new CodeEditorAgent(sttModel, llmModel, ttsModel);
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isListening: false,
          isThinking: true,
        }));
        agent
          .generateAgentCompletion(
            activeFileView?.fileContent || "",
            activeFileView?.selections || [],
            {
              audio: blob,
            },
          )
          .then((result) => {
            const changes = agent.getLineChanges(result.text.codeCompletion);
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isThinking: false,
            }));

            // Apply changes
            updateFileView({
              filePath: activeFileView?.filePath || "",
              // suggestedLines: changes,
              fileContent: result.text.codeCompletion,
              isActive: true,
            });

            // Play the audio in the blob
            if (result.audio) {
              const audio = new Audio(URL.createObjectURL(result.audio));
              audio.onended = () => {
                console.log("Audio ended");
                editorContext?.setEditorStates((prev) => ({
                  ...prev,
                  isSpeaking: false,
                }));
                isProcessingRef.current = false;
              };
              editorContext?.setEditorStates((prev) => ({
                ...prev,
                isSpeaking: true,
              }));
              audio.play();
              return;
            }
            isProcessingRef.current = false;
          });
      }
    },
  });

  // Toggle recording
  useEffect(() => {
    if (editorContext?.editorStates?.isRecording) {
      vad.start();
    } else {
      vad.stop();
    }

    return () => { 
      vad.stop();
    }
  }, [editorContext?.editorStates, vad]);

  return <></>;
}
