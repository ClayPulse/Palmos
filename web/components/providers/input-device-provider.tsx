"use client";

import useRecorder from "@/lib/hooks/use-recorder";
import { ReactNode, useContext } from "react";
import Voice from "../input-devices/voice";
import { EditorContext } from "./editor-context-provider";

export default function InputDeviceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const editorContext = useContext(EditorContext);
  const { isRecording } = useRecorder();

  // TODO: implement voice streaming
  // const streamRef = useRef<ReadableStream | undefined>(undefined);
  // const controllerRef =
  //   useRef<ReadableStreamDefaultController<Uint8Array> | null>(null);

  return (
    <div className="relative h-full w-full">
      {isRecording && (
        <Voice
          isUseClientVAD
          onReady={() => {
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isLoadingRecorder: false,
            }));
          }}
          onStart={() => {
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isListening: true,
            }));

            // TODO: implement voice streaming
            // const newStream = new ReadableStream<Uint8Array>({
            //   start(controller) {
            //     controllerRef.current = controller;
            //   },
            //   cancel() {
            //     controllerRef.current = null;
            //   },
            // });
          }}
          onEnd={(audio) => {
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isListening: false,
              isRecording: false,
              inputDeviceBuffers: {
                audioBuffer: audio,
              },
            }));

            // TODO: implement voice streaming
            // controllerRef.current?.close();
          }}
          onChunkProcessed={(audioChunk) => {
            // TODO: implement voice streaming
            // if (controllerRef.current && audio) {
            //   controllerRef.current.enqueue(new Uint8Array(audio));
            // }
          }}
        />
      )}
      {children}
    </div>
  );
}
