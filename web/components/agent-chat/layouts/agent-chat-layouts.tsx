"use client";

import { ChatMessageArea } from "@/components/agent-chat/messages/chat-message-area";
import ChatInputBar from "@/components/agent-chat/input/chat-input-bar";
import type { AgentChatLayoutProps } from "@/components/agent-chat/types";
import Icon from "@/components/misc/icon";

export type {
  AgentChatLayoutProps,
  AgentChatPanelLayoutProps,
} from "@/components/agent-chat/types";

// ── Page layout ─────────────────────────────────────────────────────────────

export function AgentChatLayout({
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
