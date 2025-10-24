"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useMicVAD, utils } from "@/lib/hooks/use-mic-vad";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { EditorContext } from "../providers/editor-context-provider";

export default function Voice({
  isUseManagedCloud,
}: {
  isUseManagedCloud: boolean;
}) {
  const editorContext = useContext(EditorContext);

  const controllerRef =
    useRef<ReadableStreamDefaultController<Uint8Array> | null>(null);
  const stream = editorContext?.editorStates.inputAudioStream;

  function onRecorderReady() {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isLoadingRecorder: true,
    }));
  }

  function onSpeechStart() {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isListening: true,
      inputAudioStream: undefined,
    }));

    const newStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef.current = controller;
      },
      cancel() {
        controllerRef.current = null;
      },
    });

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      inputAudioStream: newStream,
    }));
  }

  function onSpeechEnd() {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isListening: false,
      isRecording: false,
    }));

    if (stream) {
      controllerRef.current?.close();
    }
  }

  function onSpeechDataAvailable(audio: ArrayBuffer | undefined) {
    if (controllerRef.current && audio) {
      controllerRef.current.enqueue(new Uint8Array(audio));
    }
  }

  if (isUseManagedCloud ?? true) {
    return (
      <RecorderWrapper
        onRecorderReady={onRecorderReady}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onSpeechDataAvailable={onSpeechDataAvailable}
      />
    );
  } else {
    return (
      <VADWrapper
        onRecorderReady={onRecorderReady}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onSpeechDataAvailable={onSpeechDataAvailable}
      />
    );
  }
}

function VADWrapper({
  onRecorderReady,
  onSpeechStart,
  onSpeechEnd,
  onSpeechDataAvailable,
}: {
  onRecorderReady: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onSpeechDataAvailable: (audio: ArrayBuffer | undefined) => void;
}) {
  // const editorContext = useContext(EditorContext);
  // TODO: Use a timer to stop recorder if no speech is detected for more than 30 seconds
  const threshold = 0.75;

  const vad = useMicVAD({
    startOnLoad: false,
    baseAssetPath: "/vad/",
    onnxWASMBasePath: "/vad/",
    positiveSpeechThreshold: threshold,
    onSpeechStart: () => {
      console.log("Speech started");
      onSpeechStart();
    },
    onFrameProcessed(probabilities, frame) {
      if (probabilities.isSpeech > threshold) {
        const buffer = utils.encodeWAV(frame);

        onSpeechDataAvailable(buffer);
      }
    },
    onSpeechEnd: (audio) => {
      console.log("Speech ended", audio);
      onSpeechEnd();
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

  // Toggle recording
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    onRecorderReady();

    vad.start();

    return () => vad.stop();
  }, [isLoaded]);

  return <></>;
}

function RecorderWrapper({
  onRecorderReady,
  onSpeechStart,
  onSpeechEnd,
  onSpeechDataAvailable,
}: {
  onRecorderReady: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onSpeechDataAvailable: (audio: ArrayBuffer | undefined) => void;
}) {
  // const editorContext = useContext(EditorContext);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const controllerRef =
    useRef<ReadableStreamDefaultController<Uint8Array> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function setupRecorder() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        mediaRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && controllerRef.current) {
            const arrayBuffer = await e.data.arrayBuffer();
            onSpeechDataAvailable(arrayBuffer);
          }
        };

        mediaRecorder.onstop = () => {
          if (controllerRef.current) {
            controllerRef.current.close();
            controllerRef.current = null;
          }

          onSpeechEnd();
        };

        mediaRecorderRef.current = mediaRecorder;
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to init recorder:", err);
      }
    }

    setupRecorder();
  }, []);

  // Start/stop streaming when recording state changes
  useEffect(() => {
    if (!isLoaded || !mediaRecorderRef.current) return;

    onRecorderReady();

    // Create a ReadableStream that feeds from MediaRecorder
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef.current = controller;
      },
    });

    // Kick off fetch with stream body
    fetchAPI("/api/platform-assistant/speech-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "audio/webm;codecs=opus",
      },
      body: stream,
    }).catch((err) => {
      console.error("Stream upload failed:", err);
    });

    // Begin producing chunks every second
    mediaRecorderRef.current.start(1000);

    onSpeechStart();

    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      onSpeechEnd();
    };
  }, [isLoaded]);

  return <></>;
}
