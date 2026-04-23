"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
import { AppModeEnum } from "@/lib/enums";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export default function AppModeToggle() {
  const editorContext = useContext(EditorContext);
  const { getTranslations: t } = useTranslations();

  const [appMode, setAppMode] = useState<AppModeEnum | undefined>(undefined);

  const homeRef = useRef<HTMLButtonElement>(null);
  const agentRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLButtonElement>(null);
  const [pillDims, setPillDims] = useState<{ width: number; x: number } | null>(null);

  useLayoutEffect(() => {
    const homeBtn = homeRef.current;
    const agentBtn = agentRef.current;
    const editorBtn = editorRef.current;
    if (!homeBtn || !agentBtn || !editorBtn || !appMode) return;

    const measure = () => {
      if (appMode === AppModeEnum.Home) {
        setPillDims({ width: homeBtn.offsetWidth, x: 0 });
      } else if (appMode === AppModeEnum.Agent) {
        setPillDims({ width: agentBtn.offsetWidth, x: homeBtn.offsetWidth });
      } else {
        setPillDims({ width: editorBtn.offsetWidth, x: homeBtn.offsetWidth + agentBtn.offsetWidth });
      }
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(homeBtn);
    ro.observe(agentBtn);
    ro.observe(editorBtn);
    return () => ro.disconnect();
  }, [appMode]);

  useLayoutEffect(() => {
    setAppMode(editorContext?.editorStates.appMode ?? AppModeEnum.Home);
  }, [editorContext?.editorStates.appMode]);

  const setMode = (mode: AppModeEnum) => {
    setAppMode(mode);
    editorContext?.setEditorStates((prev) => ({ ...prev, appMode: mode }));
  };

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    setIsDark(el.classList.contains("dark"));
    const observer = new MutationObserver(() => setIsDark(el.classList.contains("dark")));
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const inactiveColor = isDark ? "#9ca3af" : "#6b7280";
  const editorActiveColor = isDark ? "#f3f4f6" : "#1f2937";

  const isAmberPill = appMode === AppModeEnum.Home || appMode === AppModeEnum.Agent;

  const colorTransition: Transition = { duration: 0.25, ease: "easeInOut" };
  const springTransition: Transition = {
    type: "spring",
    stiffness: 400,
    damping: 30,
  };

  return (
    <div className="border-default-200 bg-default-100 relative flex items-center rounded-full border p-0.5 dark:border-white/10 dark:bg-white/6">
      {pillDims && (
      <motion.div
        className="bg-content1 absolute top-0.5 bottom-0.5 left-0.5 overflow-hidden rounded-full shadow-sm dark:bg-white/15"
        initial={false}
        animate={{ width: pillDims.width, x: pillDims.x }}
        transition={springTransition}
      >
        <motion.div
          className="absolute inset-0 bg-linear-to-r from-amber-500 to-orange-500"
          animate={{ opacity: isAmberPill ? 1 : 0 }}
          transition={colorTransition}
        />
      </motion.div>
      )}

      {/* Home */}
      <button
        ref={homeRef}
        onClick={() => setMode(AppModeEnum.Home)}
        className="relative z-10 flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium md:gap-1.5 md:px-3 md:py-1.5 md:text-xs"
      >
        <motion.span
          className="flex items-center gap-0.5"
          animate={{
            color: appMode === AppModeEnum.Home ? "#ffffff" : inactiveColor,
          }}
          transition={colorTransition}
        >
          <Icon name="home" variant="round" className="text-sm" />
          <span className="hidden sm:inline">Home</span>
        </motion.span>
      </button>

      {/* Agent */}
      <button
        ref={agentRef}
        onClick={() => setMode(AppModeEnum.Agent)}
        className="relative z-10 flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium md:gap-1.5 md:px-3 md:py-1.5 md:text-xs"
      >
        <motion.span
          className="flex items-center gap-0.5"
          animate={{
            color: appMode === AppModeEnum.Agent ? "#ffffff" : inactiveColor,
          }}
          transition={colorTransition}
        >
          <Icon name="bolt" variant="round" className="text-sm" />
          <span className="hidden sm:inline">{t("appModeToggle.agent")}</span>
        </motion.span>
      </button>

      {/* Editor */}
      <button
        ref={editorRef}
        onClick={() => setMode(AppModeEnum.Editor)}
        className="relative z-10 flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium md:gap-1.5 md:px-3 md:py-1.5 md:text-xs"
      >
        <motion.span
          className="flex items-center gap-1 md:gap-1.5"
          animate={{
            color: appMode === AppModeEnum.Editor ? editorActiveColor : inactiveColor,
          }}
          transition={colorTransition}
        >
          <Icon name="code" className="text-sm" />
          <span className="hidden sm:inline">{t("appModeToggle.editor")}</span>
        </motion.span>
      </button>
    </div>
  );
}
