"use client";

import ChatInputBar from "@/components/agent-chat/input/chat-input-bar";
import ChatMessageArea from "@/components/agent-chat/blocks/text/text-block";
import Icon from "@/components/misc/icon";
import { Button, Tooltip } from "@heroui/react";
import { motion } from "framer-motion";
import type {
  AgentChatLayoutProps,
  AgentChatPanelLayoutProps,
} from "@/components/agent-chat/types";

export type {
  AgentChatLayoutProps,
  AgentChatPanelLayoutProps,
} from "@/components/agent-chat/types";

// ── Page layout ─────────────────────────────────────────────────────────────

export function AgentChatPageLayout({
  messageAreaProps,
  inputBarProps,
  quickPillButtons,
  shareModal,
  historyOverlay,
  tasksOverlay,
  sessionCount,
  canShare,
  onOpenHistory,
  onOpenTasks,
  onNewChat,
  onShare,
}: AgentChatLayoutProps) {
  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-gray-50 dark:bg-[#0d0d14]">
      {/* Top bar */}
      <div className="flex h-[60px] shrink-0 items-end justify-end px-4 sm:px-8 md:h-[72px] md:px-16 lg:px-[max(4rem,calc(50%-36rem))]">
        <div className="flex items-center gap-1.5 pb-2">
          <button
            onClick={onOpenHistory}
            className="border-default-200 text-default-600 hover:bg-default-100 flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <Icon name="history" variant="round" className="text-sm" />
            History
            {sessionCount > 0 && (
              <span className="bg-default-200 ml-0.5 rounded-full px-1.5 text-[10px] font-medium dark:bg-white/10">
                {sessionCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenTasks}
            className="border-default-200 text-default-600 hover:bg-default-100 flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <Icon name="task_alt" variant="round" className="text-sm" />
            Tasks
          </button>
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:bg-amber-500/15"
          >
            <Icon name="add" variant="round" className="text-sm" />
            New Chat
          </button>
          <button
            onClick={onShare}
            disabled={!canShare}
            className="border-default-200 text-default-600 hover:bg-default-100 flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs transition-colors disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            <Icon name="share" variant="round" className="text-sm" />
            Share
          </button>
        </div>
      </div>

      {shareModal}
      {historyOverlay}
      {tasksOverlay}

      <ChatMessageArea {...messageAreaProps} />
      <ChatInputBar {...inputBarProps} footerExtra={quickPillButtons} />
    </div>
  );
}

// ── Panel layout ────────────────────────────────────────────────────────────

export function AgentChatPanelLayout({
  messageAreaProps,
  inputBarProps,
  quickPillButtons,
  shareModal,
  historyOverlay,
  tasksOverlay,
  canShare,
  onOpenHistory,
  onOpenTasks,
  onNewChat,
  onShare,
  isLoading,
  onStop,
  onClose,
}: AgentChatPanelLayoutProps) {
  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-gray-50 shadow-lg min-[768px]:rounded-xl dark:bg-[#111118] [&>*]:min-w-0 [&>*]:overflow-hidden">
      {historyOverlay}
      {tasksOverlay}
      {shareModal}

      {/* Header */}
      <div>
        <div className="relative">
          <div className="flex items-center justify-center border-b border-amber-300/40 bg-white px-3 py-3 dark:border-white/8 dark:bg-white/3">
            <div className="absolute left-0 flex items-center gap-1 px-2">
              <Tooltip content="Chat History" delay={400} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={onOpenHistory}
                >
                  <div>
                    <Icon name="history" variant="round" />
                  </div>
                </Button>
              </Tooltip>
              <Tooltip content="New Chat" delay={400} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={onNewChat}
                >
                  <div>
                    <Icon name="add" variant="round" />
                  </div>
                </Button>
              </Tooltip>
              <Tooltip content="Tasks" delay={400} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={onOpenTasks}
                >
                  <div>
                    <Icon name="task_alt" variant="round" />
                  </div>
                </Button>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div>
                  <Icon name="bolt" className="text-lg" />
                </div>
              </motion.span>
              <motion.span
                className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-sm font-bold tracking-wide text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                PALMOS AI
              </motion.span>
            </div>
            <div className="absolute right-0 flex items-center gap-1 px-2">
              {isLoading && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-amber-600 hover:text-amber-500 dark:text-amber-400/80 dark:hover:text-amber-300"
                  onPress={onStop}
                >
                  <div>
                    <Icon name="stop" variant="round" />
                  </div>
                </Button>
              )}
              {onClose && (
                <Tooltip content="Close chat" delay={400} closeDelay={0}>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                    onPress={onClose}
                  >
                    <div>
                      <Icon name="close" variant="round" />
                    </div>
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChatMessageArea {...messageAreaProps} />

      <ChatInputBar
        {...inputBarProps}
        footerExtra={
          <>
            <Tooltip content="Share chat" delay={400} closeDelay={0}>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                isDisabled={!canShare}
                onPress={onShare}
              >
                <div>
                  <Icon name="share" variant="round" />
                </div>
              </Button>
            </Tooltip>
            {quickPillButtons}
          </>
        }
      />
    </div>
  );
}
