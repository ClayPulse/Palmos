"use client";

import { colors } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useContext } from "react";
import {
  BounceLoader,
  ClockLoader,
  PuffLoader,
  PulseLoader,
} from "react-spinners";
import { EditorContext } from "../providers/editor-context-provider";

export default function VoiceIndicator() {
  const editorContext = useContext(EditorContext);

  const { resolvedTheme } = useTheme();

  const isShowingIndicator =
    editorContext?.editorStates?.isRecording ||
    editorContext?.editorStates?.isListening ||
    editorContext?.editorStates?.isThinking ||
    editorContext?.editorStates?.isSpeaking ||
    editorContext?.editorStates?.isLoadingRecorder;

  return (
    <AnimatePresence>
      {isShowingIndicator && (
        <motion.div
          initial={{ y: -56 }}
          animate={{ y: 0 }}
          exit={{ y: -56 }}
          transition={{ duration: 0.1 }}
          className="pointer-events-none absolute flex h-full w-full items-center justify-center"
        >
          <div className="bg-content2 flex h-10 min-w-40 items-center rounded-full px-4">
            <div className="flex w-12 items-center justify-center">
              {editorContext?.editorStates?.isListening ? (
                <BounceLoader color={colors.red["300"]} size={24} />
              ) : editorContext?.editorStates?.isThinking ? (
                <PulseLoader color={colors.blue["300"]} size={8} />
              ) : editorContext?.editorStates?.isSpeaking ? (
                <PuffLoader color={colors.green["300"]} size={24} />
              ) : editorContext?.editorStates?.isLoadingRecorder ? (
                <PulseLoader
                  color={resolvedTheme === "dark" ? colors.white : colors.black}
                  size={8}
                />
              ) : (
                <ClockLoader
                  className="shadow-content2-foreground! [&>span]:bg-content2-foreground! shadow-[0px_0px_0px_2px_inset]!"
                  size={24}
                />
              )}
            </div>
            <p className="text-content2-foreground w-full text-center text-xl">
              {editorContext?.editorStates?.isListening
                ? "Listening"
                : editorContext?.editorStates?.isThinking
                  ? (editorContext.editorStates.thinkingText ?? "Thinking")
                  : editorContext?.editorStates.isSpeaking
                    ? "Speaking"
                    : editorContext.editorStates.isLoadingRecorder
                      ? "Loading Mic"
                      : "Waiting"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
