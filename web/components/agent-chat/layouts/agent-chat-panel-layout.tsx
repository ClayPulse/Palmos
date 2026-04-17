"use client";

import { ChatMessageArea } from "@/components/agent-chat/messages/chat-message-area";
import ChatInputBar from "@/components/agent-chat/input/chat-input-bar";
import type { AgentChatPanelLayoutProps } from "@/components/agent-chat/types";
import Icon from "@/components/misc/icon";
import { Button, Tooltip } from "@heroui/react";
import { motion } from "framer-motion";

export type {
  AgentChatLayoutProps,
  AgentChatPanelLayoutProps,
} from "@/components/agent-chat/types";

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
