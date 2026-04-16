"use client";

import Icon from "@/components/misc/icon";
import { formatRelativeTime } from "@/components/agent-chat/session-history";
import { useTranslations } from "@/lib/hooks/use-translations";
import type {
  InboxMessage,
  InboxMessageCardProps,
  InboxPanelProps,
} from "@/components/agent-chat/types";
import { Spinner } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export function useInbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenRef = useRef<number>(0);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/chat/inbox`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      const msgs: InboxMessage[] = (data.messages ?? []).map((m: any) => ({
        id: m.id,
        content: m.content,
        role: m.role,
        additionalKwargs: m.additionalKwargs,
        createdAt: new Date(m.createdAt).getTime(),
      }));
      setMessages(msgs);

      // Count unread
      const lastSeen = Number(localStorage.getItem("inbox-last-seen") ?? "0");
      lastSeenRef.current = lastSeen;
      const unread = msgs.filter((m) => m.createdAt > lastSeen).length;
      setUnreadCount(unread);
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    localStorage.setItem("inbox-last-seen", String(now));
    lastSeenRef.current = now;
    setUnreadCount(0);
  }, []);

  const dismiss = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`${backendUrl}/api/chat/inbox`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
    } catch {
      // Best-effort — message already removed from UI
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 30_000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  return { messages, unreadCount, markAllRead, dismiss, refetch: fetchInbox };
}

export default function InboxPanel({
  isOpen,
  onClose,
}: InboxPanelProps) {
  const { getTranslations: t } = useTranslations();
  const { messages, markAllRead, dismiss } = useInbox();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      markAllRead();
      setLoading(false);
    }
  }, [isOpen, markAllRead]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="scrollbar-transparent flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon
              name="notifications"
              variant="round"
              className="mb-2 text-3xl text-default-300 dark:text-white/20"
            />
            <p className="text-xs text-default-500 dark:text-white/40">
              {t("inboxPanel.noNotifications")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {[...messages].reverse().map((msg) => (
              <InboxMessageCard key={msg.id} message={msg} onDismiss={dismiss} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InboxMessageCard({
  message,
  onDismiss,
}: InboxMessageCardProps) {
  const { getTranslations: t } = useTranslations();
  const kwargs = message.additionalKwargs;
  const isWorkflowBuild = kwargs?.type === "workflow_build_complete";

  return (
    <div className="group border-b border-default-100 px-3.5 py-3 dark:border-white/5">
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            isWorkflowBuild
              ? "bg-green-100 dark:bg-green-500/15"
              : "bg-amber-100 dark:bg-amber-500/15"
          }`}
        >
          <Icon
            name={isWorkflowBuild ? "rocket_launch" : "notifications"}
            variant="round"
            className={`text-sm ${
              isWorkflowBuild
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-default-700 dark:text-white/75">
            {message.content}
          </p>
          <p className="mt-1 text-[10px] text-default-400 dark:text-white/30">
            {formatRelativeTime(message.createdAt, t)}
          </p>
          {isWorkflowBuild && kwargs?.workflowId && (
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("workflowId", kwargs.workflowId);
                url.searchParams.set("run", "true");
                window.location.href = url.toString();
              }}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              <Icon name="play_arrow" variant="round" className="text-xs" />
              {t("inboxPanel.tryWorkflow")}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(message.id)}
            className="shrink-0 text-default-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-default-500 dark:text-white/20 dark:hover:text-white/50"
          >
            <Icon name="close" variant="round" className="text-sm" />
          </button>
        )}
      </div>
    </div>
  );
}
