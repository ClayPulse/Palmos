"use client";

import { PlatformEnum } from "@/lib/enums";
import { useMicVAD, utils } from "@/lib/hooks/use-mic-vad";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { useEffect, useState } from "react";

export default function Voice({
  isUseClientVAD,
  onReady,
  onStart,
  onEnd,
  onChunkProcessed,
}: {
  isUseClientVAD: boolean;
  onReady?: () => void;
  onStart?: () => void;
  onEnd?: (audio: ArrayBuffer | undefined) => void;
  onChunkProcessed?: (audio: ArrayBuffer | undefined) => void;
}) {
  function onRecorderReady() {
    onReady?.();
  }

  function onSpeechStart() {
    onStart?.();
  }

  function onSpeechEnd(audio: ArrayBuffer | undefined) {
    onEnd?.(audio);
  }

  function onSpeechDataAvailable(audio: ArrayBuffer | undefined) {
    onChunkProcessed?.(audio);
  }

  if (!isUseClientVAD) {
    // TODO: Implement server-side VAD
    return null;
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
  onSpeechEnd: (audio: ArrayBuffer | undefined) => void;
  onSpeechDataAvailable: (audio: ArrayBuffer | undefined) => void;
}) {
  // TODO: Use a timer to stop recorder if no speech is detected for more than 30 seconds
  const threshold = 0.75;

  const vad = useMicVAD({
    startOnLoad: false,
    baseAssetPath:
      getPlatform() === PlatformEnum.Web &&
      process.env.NODE_ENV === "production"
        ? "https://cdn.palmos.ai/assets/vad/"
        : "/vad/",
    onnxWASMBasePath:
      getPlatform() === PlatformEnum.Web &&
      process.env.NODE_ENV === "production"
        ? "https://cdn.palmos.ai/assets/vad/"
        : "/vad/",
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
      const buffer = utils.encodeWAV(audio);
      onSpeechEnd(buffer);
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
  }, [vad, startedLoading]);

  // Toggle recording
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    onRecorderReady();

    vad.start();
  }, [isLoaded]);

  return <></>;
}
