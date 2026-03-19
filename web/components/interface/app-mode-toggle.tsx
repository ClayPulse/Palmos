"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import { useContext, useLayoutEffect, useRef, useState } from "react";

export default function AppModeToggle() {
  const editorContext = useContext(EditorContext);

  const [appMode, setAppMode] = useState<AppModeEnum>(
    editorContext?.editorStates.appMode ?? AppModeEnum.Agent,
  );

  const chatRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLButtonElement>(null);
  const [pillDims, setPillDims] = useState({ width: 0, x: 0 });

  useLayoutEffect(() => {
    const chatBtn = chatRef.current;
    const editorBtn = editorRef.current;
    if (!chatBtn || !editorBtn) return;
    if (appMode === AppModeEnum.Agent) {
      setPillDims({ width: chatBtn.offsetWidth, x: 0 });
    } else {
      setPillDims({ width: editorBtn.offsetWidth, x: chatBtn.offsetWidth });
    }
  }, [appMode]);

  const setMode = (mode: AppModeEnum) => {
    setAppMode(mode);
    editorContext?.setEditorStates((prev) => ({ ...prev, appMode: mode }));
  };

  const colorTransition: Transition = { duration: 0.25, ease: "easeInOut" };
  const springTransition: Transition = {
    type: "spring",
    stiffness: 400,
    damping: 30,
  };

  return (
    <div className="border-default-200 bg-default-100 relative flex items-center rounded-full border p-0.5 dark:border-white/10 dark:bg-white/6">
      {/* Single always-rendered pill – slides, resizes, and crossfades color */}
      <motion.div
        className="bg-content1 absolute top-0.5 bottom-0.5 left-0.5 overflow-hidden rounded-full shadow-sm dark:bg-white/12"
        animate={{ width: pillDims.width, x: pillDims.x }}
        transition={springTransition}
      >
        {/* Gradient overlay fades in for chat, out for editor */}
        <motion.div
          className="absolute inset-0 bg-linear-to-r from-amber-500 to-orange-500"
          animate={{ opacity: appMode === AppModeEnum.Agent ? 1 : 0 }}
          transition={colorTransition}
        />
      </motion.div>

      <button
        ref={chatRef}
        onClick={() => setMode(AppModeEnum.Agent)}
        className="relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
      >
        <motion.span
          className="flex items-center gap-0.5"
          animate={{
            color: appMode === AppModeEnum.Agent ? "#ffffff" : "#6b7280",
          }}
          transition={colorTransition}
        >
          <Icon name="bolt" variant="round" className="text-sm" />
          Agent
        </motion.span>
      </button>
      <button
        ref={editorRef}
        onClick={() => setMode(AppModeEnum.Editor)}
        className="relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
      >
        <motion.span
          className="flex items-center gap-1.5"
          animate={{
            color: appMode === AppModeEnum.Editor ? "#1f2937" : "#6b7280",
          }}
          transition={colorTransition}
        >
          <Icon name="code" className="text-sm" />
          Editor
        </motion.span>
      </button>
    </div>
  );
}
