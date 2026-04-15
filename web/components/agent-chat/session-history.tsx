"use client";

import Icon from "@/components/misc/icon";
import { motion } from "framer-motion";

export function SessionHistoryPanel({
  sessions,
  activeSessionId,
  onSwitch,
  onDelete,
  onNewChat,
  onClose,
  onShare,
}: {
  sessions: { id: string; title: string; updatedAt: number }[];
  activeSessionId: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  onShare?: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 z-20 flex flex-col bg-gray-50 dark:bg-[#0d0d14]"
    >
      <div className="flex items-center justify-between border-b border-amber-200/40 px-4 py-3 dark:border-white/8">
        <h3 className="text-default-800 text-sm font-semibold dark:text-white/90">
          Chat History
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:bg-amber-500/15"
          >
            <Icon name="add" variant="round" className="text-sm" />
            New
          </button>
          <button
            onClick={onClose}
            className="text-default-400 hover:text-default-600 flex h-8 w-8 items-center justify-center rounded-lg dark:text-white/40 dark:hover:text-white/70"
          >
            <Icon name="close" variant="round" className="text-base" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="text-default-400 py-8 text-center text-xs dark:text-white/40">
            No chat history yet
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  s.id === activeSessionId
                    ? "bg-amber-100/80 dark:bg-amber-500/15"
                    : "hover:bg-default-100 dark:hover:bg-white/5"
                }`}
                onClick={() => {
                  onSwitch(s.id);
                  onClose();
                }}
              >
                <Icon
                  name="chat_bubble_outline"
                  variant="round"
                  className="text-default-400 shrink-0 text-sm dark:text-white/40"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-default-700 truncate text-xs font-medium dark:text-white/80">
                    {s.title}
                  </p>
                  <p className="text-default-400 text-[10px] dark:text-white/35">
                    {formatRelativeTime(s.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {onShare && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(s.id);
                      }}
                      className="text-default-400 flex h-6 w-6 items-center justify-center rounded transition-colors hover:text-amber-600 dark:text-white/30 dark:hover:text-amber-400"
                    >
                      <Icon
                        name="share"
                        variant="round"
                        className="text-sm"
                      />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    className="text-default-300 flex h-6 w-6 items-center justify-center rounded opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 dark:text-white/20 dark:hover:text-red-400"
                  >
                    <Icon
                      name="delete_outline"
                      variant="round"
                      className="text-sm"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
