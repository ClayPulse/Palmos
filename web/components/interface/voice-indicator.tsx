"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useContext } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import {
  BounceLoader,
  ClockLoader,
  PuffLoader,
  PulseLoader,
} from "react-spinners";
import { colors } from "@heroui/react";

export default function VoiceIndicator() {
  const editorContext = useContext(EditorContext);

  return (
    <AnimatePresence>
      {editorContext?.editorStates?.isRecording && (
        <motion.div
          initial={{ y: -56 }}
          animate={{ y: 48 }}
          exit={{ y: -56 }}
          transition={{ duration: 0.1 }}
          className="absolute flex h-full w-full items-center justify-center"
        >
          <div className="flex h-10 w-40 items-center rounded-full bg-content2 px-4">
            <div className="flex w-12 items-center justify-center">
              {editorContext?.editorStates?.isListening ? (
                <BounceLoader color={colors.red["300"]} size={24} />
              ) : editorContext?.editorStates?.isThinking ? (
                <PulseLoader color={colors.blue["300"]} size={8} />
              ) : editorContext?.editorStates?.isSpeaking ? (
                <PuffLoader color={colors.green["300"]} size={24} />
              ) : (
                <ClockLoader
                  className="shadow-[0px_0px_0px_2px_inset]! shadow-content2-foreground! [&>span]:bg-content2-foreground!"
                  size={24}
                />
              )}
            </div>
            <p className="w-full text-center text-xl text-content2-foreground">
              {editorContext?.editorStates?.isListening
                ? "Listening"
                : editorContext?.editorStates?.isThinking
                  ? "Thinking"
                  : editorContext?.editorStates.isSpeaking
                    ? "Speaking"
                    : "Waiting"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
