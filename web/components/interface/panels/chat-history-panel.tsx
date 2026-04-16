"use client";

import { formatRelativeTime } from "@/components/agent-chat/helpers";
import ShareChatModal from "@/components/modals/share-chat-modal";
import Icon from "@/components/misc/icon";
import { useChatContext } from "@/components/providers/chat-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Threshold below which the panel treats its container as "narrow" and renders
// a full-overlay slide-in instead of an inline side panel.
const NARROW_BREAKPOINT = 500;

export default function ChatHistoryPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { sessions, currentSessionIdRef, handleNewChat, handleSwitchSession, handleDeleteSession } =
    useChatContext();
  const { getTranslations: t } = useTranslations();
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);

  // Container-based responsive: observe the parent's width, not the viewport.
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(true);

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < NARROW_BREAKPOINT);
    });
    observer.observe(el);
    // Sync immediately so first render matches the container
    setIsNarrow(el.getBoundingClientRect().width < NARROW_BREAKPOINT);
    return () => observer.disconnect();
  }, []);

  const header = (compact: boolean) => (
    <div className={`flex shrink-0 items-center justify-between border-b border-default-200 dark:border-white/8 ${compact ? "px-3 py-2.5" : "px-3 py-2"}`}>
      <h3 className={`font-semibold uppercase tracking-wider text-default-500 dark:text-default-500 ${compact ? "text-[10px]" : "text-xs"}`}>
        {t("sessionHistory.chatHistory")}
      </h3>
      <div className="flex items-center gap-1">
        <button
          onClick={() => { handleNewChat(); if (!compact) onClose(); }}
          className={`flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:bg-amber-500/15 ${compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"}`}
        >
          <Icon name="add" variant="round" className={compact ? "text-sm" : "text-base"} />
          {t("sessionHistory.new")}
        </button>
        <button
          onClick={onClose}
          className={`flex items-center justify-center rounded text-default-400 transition-colors hover:text-default-600 dark:text-white/40 dark:hover:text-white/70 ${compact ? "h-7 w-7" : "h-8 w-8"}`}
        >
          <Icon name="close" variant="round" className={compact ? "text-sm" : "text-xl"} />
        </button>
      </div>
    </div>
  );

  const sessionList = (compact: boolean) => (
    <div className="scrollbar-transparent flex-1 overflow-y-auto px-2 pb-2">
      {sessions.length === 0 ? (
        <p className={`text-center text-default-500 dark:text-default-500 ${compact ? "py-8 text-xs" : "py-12 text-sm"}`}>
          {t("sessionHistory.noChatHistory")}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg text-left transition-colors ${
                compact ? "px-2.5 py-2" : "px-3 py-3"
              } ${
                s.id === currentSessionIdRef.current
                  ? "bg-amber-100/80 dark:bg-amber-500/15"
                  : "hover:bg-default-100 dark:hover:bg-white/5"
              }`}
              onClick={() => { handleSwitchSession(s.id); onClose(); }}
            >
              <Icon
                name="chat_bubble_outline"
                variant="round"
                className={`shrink-0 text-default-500 dark:text-default-500 ${compact ? "text-sm" : "text-base"}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium text-default-700 dark:text-white/80 ${compact ? "text-xs" : "text-sm"}`}>
                  {s.title}
                </p>
                <p className={`text-default-500 dark:text-default-500 ${compact ? "text-[10px]" : "text-xs"}`}>
                  {formatRelativeTime(s.updatedAt ?? s.createdAt, t)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); setShareSessionId(s.id); }}
                  className={`flex items-center justify-center rounded text-default-400 transition-colors hover:text-amber-600 dark:text-white/30 dark:hover:text-amber-400 ${compact ? "h-6 w-6" : "h-7 w-7"}`}
                >
                  <Icon name="share" variant="round" className={compact ? "text-sm" : "text-base"} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                  className={`flex items-center justify-center rounded text-default-300 transition-colors hover:text-red-500 dark:text-white/20 dark:hover:text-red-400 ${compact ? "h-6 w-6" : "h-7 w-7"}`}
                >
                  <Icon name="delete_outline" variant="round" className={compact ? "text-sm" : "text-base"} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    // Sentinel div — its parentElement is what we observe for container width.
    <div ref={containerRef} className="contents">
      <ShareChatModal
        sessionId={shareSessionId}
        isOpen={!!shareSessionId}
        onClose={() => setShareSessionId(null)}
      />
      <AnimatePresence>
        {isOpen && (
          !isNarrow ? (
            /* Wide container: inline side panel that slides in */
            <motion.div
              className="h-full shrink-0 overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: 260 }}
              exit={{ width: 0 }}
              transition={{ type: "tween", duration: 0.2 }}
            >
              <div className="flex h-full w-[260px] flex-col border-r border-default-200 bg-default-50 dark:border-white/8 dark:bg-[#0d0d14]">
                {header(true)}
                {sessionList(true)}
              </div>
            </motion.div>
          ) : (
            /* Narrow container: full-area overlay that slides in from left */
            <motion.div
              className="absolute inset-0 z-50 h-full w-full"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
            >
              <div className="flex h-full w-full flex-col bg-default-50 dark:bg-[#0d0d14]">
                {header(false)}
                {sessionList(false)}
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
