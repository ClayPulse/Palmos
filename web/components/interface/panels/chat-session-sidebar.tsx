"use client";

import Icon from "@/components/misc/icon";
import { useChatContext } from "@/components/providers/chat-provider";
import { formatRelativeTime } from "@/components/agent-chat/session-history";
import { AnimatePresence, motion } from "framer-motion";

export default function ChatSessionSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    sessions,
    activeSessionId,
    currentSessionIdRef,
    handleNewChat,
    handleSwitchSession,
    handleDeleteSession,
  } = useChatContext();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="h-full shrink-0 overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: 280 }}
          exit={{ width: 0 }}
          transition={{ type: "tween", duration: 0.2 }}
        >
          <div className="flex h-full w-[280px] flex-col border-r border-default-200 bg-default-50 dark:border-white/8 dark:bg-[#0d0d14]">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-3 py-3">
              <h3 className="text-sm font-semibold text-default-700 dark:text-white/85">
                Chat History
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    handleNewChat();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:bg-amber-500/15"
                >
                  <Icon name="add" variant="round" className="text-sm" />
                  New
                </button>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-default-400 hover:text-default-600 dark:text-white/40 dark:hover:text-white/70"
                >
                  <Icon name="chevron_left" variant="round" className="text-base" />
                </button>
              </div>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 ? (
                <p className="py-12 text-center text-xs text-default-400 dark:text-white/40">
                  No chat history yet
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        s.id === (activeSessionId ?? currentSessionIdRef.current)
                          ? "bg-amber-100/80 dark:bg-amber-500/15"
                          : "hover:bg-default-100 dark:hover:bg-white/5"
                      }`}
                      onClick={() => handleSwitchSession(s.id)}
                    >
                      <Icon
                        name="chat_bubble_outline"
                        variant="round"
                        className="shrink-0 text-sm text-default-400 dark:text-white/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-default-700 dark:text-white/80">
                          {s.title}
                        </p>
                        <p className="text-[10px] text-default-400 dark:text-white/35">
                          {formatRelativeTime(s.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(s.id);
                        }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-default-300 opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 dark:text-white/20 dark:hover:text-red-400"
                      >
                        <Icon
                          name="delete_outline"
                          variant="round"
                          className="text-sm"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
