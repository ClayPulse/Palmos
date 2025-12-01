import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BaseSTT } from "../modalities/stt/base-stt";
import { getSTTModel } from "../modalities/stt/get-stt";
import { BaseTTS } from "../modalities/tts/base-tts";
import { getTTSModel } from "../modalities/tts/get-tts";
import { getAPIKey } from "../settings/api-manager-utils";

export default function useSpeech2Speech() {
  const editorContext = useContext(EditorContext);

  const [isRunning, setIsRunning] = useState(false);

  const [textProcessFunc, setTextProcessFunc] = useState<
    ((inputText: string) => Promise<string>) | undefined
  >(undefined);
  const [textProcessStreamFunc, setTextProcessStreamFunc] = useState<
    ((inputText: string) => Promise<ReadableStream<string>>) | undefined
  >(undefined);

  const [sttModel, setSttModel] = useState<BaseSTT | undefined>(undefined);
  const [isSTTDone, setIsSTTDone] = useState(false);

  const [transcript, setTranscript] = useState<string>("");
  const [processedText, setProcessedText] = useState<string>("");
  const [isTextProcessingDone, setIsTextProcessingDone] = useState(false);

  const [ttsModel, setTtsModel] = useState<BaseTTS | undefined>(undefined);

  function initStates() {
    setIsRunning(false);
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
      if (!isRunning) {
        return;
      }
      if (!sttModel) {
        return;
      }

      const audio = editorContext?.editorStates.inputDeviceBuffers?.audioBuffer;
      if (audio) {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isListening: false,
          isThinking: true,
        }));

        const transcript = await sttModel.generateStream(audio, "mp3");
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
      }
    }

    processInputAudio().catch((error) => {
      console.error("Error processing input audio:", error);
      toast.error("Error processing input audio. Please try again.");
      stopSpeech2Speech();
    });
  }, [
    editorContext?.editorStates.inputDeviceBuffers?.audioBuffer,
    sttModel,
    isRunning,
  ]);

  // Process the transcript via a text processing function
  useEffect(() => {
    async function processTranscript() {
      if (!isRunning) {
        return;
      } else if (!isSTTDone) {
        return;
      }

      console.log("Processing transcript:", transcript);

      if (textProcessStreamFunc !== undefined) {
        // Process the transcript as the stream is being generated
        const stream = await textProcessStreamFunc(transcript);

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
    isRunning,
  ]);

  // Send processed text to TTS for final output audio
  useEffect(() => {
    async function processOutputAudio() {
      if (!isRunning) {
        return;
      } else if (!ttsModel) {
        return;
      } else if (!isTextProcessingDone) {
        return;
      } else if (processedText.length === 0) {
        return;
      }

      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isThinking: false,
        thinkingText: undefined,
        isSpeaking: true,
      }));

      // Play the audio stream
      const audio: ReadableStream<ArrayBuffer> =
        await ttsModel.generateStream(processedText);

      let buffer = new ArrayBuffer(0);
      const reader = audio.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        // Append value to buffer
        const tmp = new Uint8Array(buffer.byteLength + value.byteLength);
        tmp.set(new Uint8Array(buffer), 0);
        tmp.set(new Uint8Array(value), buffer.byteLength);
        buffer = tmp.buffer;
      }

      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      const audioBuffer = await audioContext.decodeAudioData(buffer);
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      source.onended = () => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isSpeaking: false,
        }));
        setIsRunning(false);
      };
    }

    processOutputAudio().catch((error) => {
      console.error("Error processing output audio:", error);
      toast.error("Error processing output audio. Please try again.");
      stopSpeech2Speech();
    });
  }, [processedText, isTextProcessingDone, isRunning]);

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
      return;
    }
    const stt = getSTTModel({
      apiKey: sttKey,
      modelId: `${sttProvider}/${sttModel}`,
    });
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
  function runSpeech2Speech(
    textProcessFunc?: (inputText: string) => Promise<string>,
    textProcessStreamFunc?: (
      inputText: string,
    ) => Promise<ReadableStream<string>>,
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

    setIsRunning(true);
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
      thinkingText: undefined,
      isSpeaking: false,
      inputAudioStream: undefined,
    }));
  }

  return {
    isRunning,
    runSpeech2Speech,
    stopSpeech2Speech,
  };
}
