"use client";

import { getLastAIContent } from "@/components/agent-chat/helpers";
import Icon from "@/components/misc/icon";
import MarkdownRender from "@/components/misc/markdown-render";
import type { SubagentInfo } from "@/lib/types";
import { Spinner } from "@heroui/react";
import { useState } from "react";

export function SubagentCard({ subagent }: { subagent: SubagentInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const description =
    subagent.toolCall.args.description ?? subagent.toolCall.name;
  const agentType =
    subagent.toolCall.args.subagent_type ?? subagent.toolCall.name;

  const elapsed = subagent.startedAt
    ? Math.round(
        ((subagent.completedAt?.getTime() ?? Date.now()) -
          subagent.startedAt.getTime()) /
          1000,
      )
    : 0;

  const latestContent =
    subagent.status === "complete" && subagent.result
      ? subagent.result
      : getLastAIContent(subagent.messages);

  const statusIcon =
    subagent.status === "running" ? (
      <Spinner size="sm" />
    ) : subagent.status === "complete" ? (
      <Icon
        name="check_circle"
        variant="round"
        className="text-sm text-green-500"
      />
    ) : subagent.status === "error" ? (
      <Icon name="error" variant="round" className="text-sm text-red-500" />
    ) : (
      <span className="text-default-300 text-xs dark:text-white/30">○</span>
    );

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-amber-200/60 bg-white text-xs shadow-sm dark:border-white/10 dark:bg-white/6">
      <button
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {statusIcon}
        <span className="text-default-700 flex-1 truncate font-medium dark:text-white/90">
          {agentType}
        </span>
        {elapsed > 0 && (
          <span className="text-default-400 tabular-nums dark:text-white/50">
            {elapsed}s
          </span>
        )}
        <Icon
          name={isExpanded ? "expand_less" : "expand_more"}
          variant="round"
          className="text-default-400 text-sm dark:text-white/50"
        />
      </button>

      {isExpanded && (
        <div className="space-y-1 border-t border-amber-200/60 px-2.5 py-2 dark:border-white/8">
          <p className="text-default-500 dark:text-white/65">{description}</p>
          {latestContent && (
            <div className="text-default-600 mt-1 dark:text-white/80">
              <MarkdownRender content={latestContent} />
            </div>
          )}
          {subagent.status === "running" && (
            <div className="flex items-center gap-1.5 pt-1">
              <Spinner size="sm" />
              <span className="text-amber-500/60 dark:text-amber-300/80">
                Working...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
