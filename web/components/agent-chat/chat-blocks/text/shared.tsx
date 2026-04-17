"use client";

import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";
import { Spinner, Tooltip } from "@heroui/react";
import { useCallback, useState } from "react";

type StatusKind = "pending" | "running" | "complete" | "error";

export function StatusBadge({ status }: { status: StatusKind }) {
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

export function StatusIcon({ status }: { status: StatusKind }) {
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

export function CopyButton({ text }: { text: string }) {
  const { getTranslations: t } = useTranslations();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <Tooltip
      content={copied ? t("messageBubbles.copied") : t("messageBubbles.copy")}
      size="sm"
    >
      <button
        onClick={handleCopy}
        className="text-default-300 hover:text-default-500 transition-colors dark:text-white/20 dark:hover:text-white/60"
      >
        <Icon
          name={copied ? "check" : "content_copy"}
          variant="round"
          className="text-sm"
        />
      </button>
    </Tooltip>
  );
}
