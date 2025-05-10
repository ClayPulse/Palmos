import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useRef, useState } from "react";
import { BaseTTS, getModelTTS } from "../tts/tts";
import { getAPIKey } from "../settings/settings";
import { BaseSTT, getModelSTT } from "../stt/stt";
import toast from "react-hot-toast";

export default function useSpeech2Speech() {
  const editorContext = useContext(EditorContext);

  const [isUsing, setIsUsing] = useState(false);

  const [textProcessFunc, setTextProcessFunc] = useState<
    ((inputText: string) => Promise<string>) | undefined
  >(undefined);
  const [textProcessStreamFunc, setTextProcessStreamFunc] = useState<
    ((inputText: string) => ReadableStream<string>) | undefined
  >(undefined);

  const [sttModel, setSttModel] = useState<BaseSTT | undefined>(undefined);
  const [isSTTDone, setIsSTTDone] = useState(false);

  const [transcript, setTranscript] = useState<string>("");
  const [processedText, setProcessedText] = useState<string>("");
  const [isTextProcessingDone, setIsTextProcessingDone] = useState(false);

  const [ttsModel, setTtsModel] = useState<BaseTTS | undefined>(undefined);

  function initStates() {
    setIsUsing(false);
    setTextProcessFunc(undefined);
    setTextProcessStreamFunc(undefined);
    setIsSTTDone(false);
    setTranscript("");
    setProcessedText("");
    setIsTextProcessingDone(false);
  }

  // Process the input audio stream and generate the transcript.
  // This always uses streaming STT, so we can process the audio as it comes in.
  useEffect(() => {
    async function processInputAudio() {
      if (!isUsing) {
        return;
      }
      if (!sttModel) {
        console.error(
          "STT model is not available. Cannot process input audio.",
        );
        return;
      }

      const audio = editorContext?.editorStates.inputAudioStream;
      if (audio) {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isListening: false,
          isThinking: true,
        }));

        if (sttModel.isAllowStreaming()) {
          const transcript = await sttModel.generateStream(audio);
          const reader = transcript.getReader();
          let result = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // The stream is done, so we can stop processing
              // and set the input audio stream to undefined.
              editorContext?.setEditorStates((prev) => ({
                ...prev,
                inputAudioStream: undefined,
              }));
              setIsSTTDone(true);
              return;
            }
            result += value; // Append the new chunk to the result
            setTranscript(result);
          }
        } else {
          const text = await sttModel.generate(audio);
          setTranscript(text);
          setIsSTTDone(true);
          editorContext?.setEditorStates((prev) => ({
            ...prev,
            inputAudioStream: undefined,
          }));
        }
      }
    }

    processInputAudio().catch((error) => {
      console.error("Error processing input audio:", error);
      toast.error("Error processing input audio. Please try again.");
      stopSpeech2Speech();
    });
  }, [editorContext?.editorStates.inputAudioStream, sttModel, isUsing]);

  // Process the transcript via a text processing function
  useEffect(() => {
    async function processTranscript() {
      if (!isUsing) {
        return;
      }
      if (!isSTTDone) {
        return;
      }

      console.log("Processing transcript:", transcript);

      if (textProcessStreamFunc !== undefined) {
        // Process the transcript as the stream is being generated
        const stream = textProcessStreamFunc(transcript);

        const reader = stream.getReader();
        let result = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // The stream is done, so we can stop processing
            setProcessedText(result);
            setIsTextProcessingDone(true);
            return;
          }
          result += value; // Append the new chunk to the result
        }
      } else if (textProcessFunc !== undefined) {
        console.log(textProcessFunc);
        // Process the transcript after the recording is stopped
        if (!editorContext?.editorStates.isRecording && transcript.length > 0) {
          const text = await textProcessFunc(transcript);
          setProcessedText(text);
          setIsTextProcessingDone(true);
        }
      }
    }

    processTranscript().catch((error) => {
      console.error("Error processing transcript:", error);
      toast.error("Error processing transcript. Please try again.");
      stopSpeech2Speech();
    });
  }, [
    transcript,
    textProcessFunc,
    textProcessStreamFunc,
    editorContext?.editorStates.isRecording,
    isSTTDone,
    isUsing,
  ]);

  // Send processed text to TTS for final output audio
  useEffect(() => {
    async function processOutputAudio() {
      if (!isUsing) {
        return;
      }
      if (!ttsModel) {
        console.error("TTS model is not available. Cannot process text.");
        return;
      } else if (!isTextProcessingDone) {
        return;
      }

      const audio = await ttsModel.generateStream(processedText);

      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isThinking: false,
        isSpeaking: true,
      }));

      // Play the audio stream
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      const audioBuffer = await audioContext.decodeAudioData(
        await audio.arrayBuffer(),
      );
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      source.onended = () => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isSpeaking: false,
        }));
        setIsUsing(false);
      };
    }

    processOutputAudio().catch((error) => {
      console.error("Error processing output audio:", error);
      toast.error("Error processing output audio. Please try again.");
      stopSpeech2Speech();
    });
  }, [processedText, isTextProcessingDone, isUsing]);

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
      console.error(
        "TTS key, provider, model or voice is not set. TTS will not be available.",
      );
      return;
    }
    const tts = getModelTTS(ttsKey, ttsProvider, ttsModel, ttsVoice);
    if (tts) {
      setTtsModel(tts);
    } else {
      console.error("TTS model is not available.");
    }
  }, [editorContext?.persistSettings]);

  // Load STT model
  useEffect(() => {
    if (!editorContext?.persistSettings) {
      return;
    }

    const sttKey = getAPIKey(
      editorContext,
      editorContext?.persistSettings?.sttProvider,
    );
    const sttProvider = editorContext?.persistSettings?.sttProvider;
    const sttModel = editorContext?.persistSettings?.sttModel;

    if (!sttKey || !sttProvider || !sttModel) {
      console.error(
        "STT key, provider or model is not set. STT will not be available.",
      );
      return;
    }
    const stt = getModelSTT(sttKey, sttProvider, sttModel);
    if (stt) {
      setSttModel(stt);
    } else {
      console.error("STT model is not available.");
    }
  }, [editorContext?.persistSettings]);

  /**
   *
   * @param textProcessFunc Function to process the result of STT,
   * and return the input text for TTS.
   */
  async function runSpeech2Speech(
    textProcessFunc?: (inputText: string) => Promise<string>,
    textProcessStreamFunc?: (inputText: string) => ReadableStream<string>,
  ) {
    if (!editorContext) {
      throw new Error("Editor context is not initialized.");
    } else if (editorContext.editorStates.isRecording) {
      throw new Error("Recording is already in progress.");
    }

    initStates();

    if (textProcessFunc !== undefined) {
      setTextProcessFunc(() => textProcessFunc);
      setTextProcessStreamFunc(() => undefined);
    } else if (textProcessStreamFunc !== undefined) {
      setTextProcessFunc(() => undefined);
      setTextProcessStreamFunc(() => textProcessStreamFunc);
    } else {
      console.error("No text processing function provided.");
      return;
    }

    // Start recording
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isRecording: true,
    }));

    setIsUsing(true);
  }

  function stopSpeech2Speech() {
    if (!editorContext) {
      throw new Error("Editor context is not initialized.");
    }

    // Stop recording
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isRecording: false,
      isListening: false,
      isThinking: false,
      isSpeaking: false,
      inputAudioStream: undefined,
    }));
  }

  return {
    runSpeech2Speech,
    stopSpeech2Speech,
  };
}
