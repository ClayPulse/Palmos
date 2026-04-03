"use client";

import InlineWidget, {
  type InlineWidgetData,
} from "@/components/chat/inline-widget";
import Icon from "@/components/misc/icon";
import MarkdownRender from "@/components/misc/markdown-render";
import { Spinner } from "@heroui/react";
import { useState } from "react";

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm text-white shadow-sm">
        <p className="text-xs font-semibold text-white/80">User:</p>
        <p className="mt-0.5 text-white">{text}</p>
      </div>
    </div>
  );
}

export function AIResponseCard({
  content,
  isStreaming,
  widgets = [],
}: {
  content: string;
  isStreaming: boolean;
  widgets?: InlineWidgetData[];
}) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[88%] gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 p-1 dark:bg-amber-500/15">
          <img
            src="/assets/pulse-logo.svg"
            alt="Palmos"
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-default-400 mb-1 text-[10px] font-semibold tracking-wide uppercase dark:text-white/40">
            AI Manager:
          </p>
          {content && (
            <div className="text-default-800 rounded-2xl rounded-tl-sm border border-amber-200/60 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-white/10 dark:bg-white/6 dark:text-white/85">
              <MarkdownRender content={content} />
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-amber-500 align-text-bottom" />
              )}
            </div>
          )}
          {widgets.map((w, wi) => (
            <InlineWidget key={wi} data={w} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ResponseCard({
  content,
  isStreaming,
  widgets = [],
}: {
  content: string;
  isStreaming: boolean;
  widgets?: InlineWidgetData[];
}) {
  const [expanded, setExpanded] = useState(true);
  const status: "running" | "complete" = isStreaming ? "running" : "complete";

  return (
    <div className="rounded-lg border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className="text-default-700 text-xs font-semibold dark:text-white/90">
            AI Manager
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <Icon
            name={expanded ? "expand_less" : "expand_more"}
            variant="round"
            className="text-default-400 text-sm dark:text-white/50"
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-200/60 dark:border-white/8">
          {content && (
            <div className="px-3 py-2.5">
              <MarkdownRender content={content} />
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-amber-500 align-text-bottom" />
              )}
            </div>
          )}
          {widgets.length > 0 && (
            <div className="px-3 pb-3">
              {widgets.map((w, wi) => (
                <InlineWidget key={wi} data={w} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: "pending" | "running" | "complete" | "error";
}) {
  const styles = {
    pending:
      "bg-default-100 text-default-500 dark:bg-white/10 dark:text-white/50",
    running:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    complete:
      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    error: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function StatusIcon({
  status,
}: {
  status: "pending" | "running" | "complete" | "error";
}) {
  switch (status) {
    case "pending":
      return (
        <span className="text-default-300 text-sm dark:text-white/30">○</span>
      );
    case "running":
      return <Spinner size="sm" />;
    case "complete":
      return (
        <Icon
          name="check_circle"
          variant="round"
          className="text-sm text-green-500 dark:text-green-400"
        />
      );
    case "error":
      return (
        <Icon
          name="error"
          variant="round"
          className="text-sm text-red-500 dark:text-red-400"
        />
      );
  }
}
