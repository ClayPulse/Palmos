"use client";

import { SessionHistoryPanel } from "@/components/agent-chat/session-history";
import type { HistoryOverlayProps } from "@/components/agent-chat/types";

export default function HistoryOverlay({
  isPage,
  sessions,
  activeSessionId,
  onSwitch,
  onDelete,
  onNewChat,
  onClose,
  onShare,
}: HistoryOverlayProps) {
  if (isPage) {
    return (
      <div className="absolute inset-0 z-30 flex">
        <div className="w-full max-w-sm">
          <SessionHistoryPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSwitch={onSwitch}
            onDelete={onDelete}
            onNewChat={onNewChat}
            onClose={onClose}
            onShare={onShare}
          />
        </div>
        <div
          className="flex-1 bg-black/20 dark:bg-black/40"
          onClick={onClose}
        />
      </div>
    );
  }

  return (
    <SessionHistoryPanel
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSwitch={onSwitch}
      onDelete={onDelete}
      onNewChat={onNewChat}
      onClose={onClose}
    />
  );
}
