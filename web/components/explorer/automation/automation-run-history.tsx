"use client";

import Icon from "@/components/misc/icon";
import { useAutomationRuns } from "@/lib/hooks/use-automations";
import { AutomationRun, TriggerType } from "@/lib/types";
import { Button, Chip, Spinner } from "@heroui/react";
import { useState } from "react";

const TRIGGER_ICONS: Record<TriggerType, string> = {
  schedule: "schedule",
  webhook: "link",
  manual: "play_arrow",
  agentic: "bolt",
};

const STATUS_CONFIG: Record<
  string,
  { icon: string; color: "success" | "danger" | "primary" | "default" }
> = {
  completed: { icon: "check_circle", color: "success" },
  failed: { icon: "error", color: "danger" },
  running: { icon: "sync", color: "primary" },
  pending: { icon: "hourglass_empty", color: "default" },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RunRow({ run }: { run: AutomationRun }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending;
  const triggerIcon = TRIGGER_ICONS[run.triggerSource] ?? "play_arrow";

  return (
    <div className="border-default-100 border-b last:border-b-0">
      <button
        onClick={() => run.error && setExpanded(!expanded)}
        className="hover:bg-content2 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
      >
        <Icon
          name={triggerIcon}
          variant="round"
          className="text-default-400 text-sm"
        />

        <Chip
          size="sm"
          color={statusCfg.color}
          variant="flat"
          startContent={
            <Icon name={statusCfg.icon} className="text-xs" />
          }
          classNames={{ content: "text-xs" }}
        >
          {run.status}
        </Chip>

        <span className="text-default-500 flex-1 text-xs">
          {formatRelativeTime(run.startedAt)}
        </span>

        {run.durationMs != null && (
          <span className="text-default-400 text-xs">
            {formatDuration(run.durationMs)}
          </span>
        )}

        <span className="text-default-400 text-xs">
          {run.creditsConsumed.toFixed(2)} cr
        </span>

        {run.nodeCount > 0 && (
          <span className="text-default-400 text-xs">
            {run.nodeCount} nodes
          </span>
        )}

        {run.error && (
          <Icon
            name={expanded ? "expand_less" : "expand_more"}
            className="text-default-400 text-sm"
          />
        )}
      </button>

      {expanded && run.error && (
        <div className="bg-danger-50 dark:bg-danger-50/10 mx-3 mb-2 rounded px-3 py-2">
          <p className="text-danger text-xs font-mono break-all">{run.error}</p>
        </div>
      )}
    </div>
  );
}

export default function AutomationRunHistory({
  automationId,
}: {
  automationId: string;
}) {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const { runs, total, isLoading } = useAutomationRuns(automationId, limit, offset);

  const hasMore = offset + limit < total;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Run History</p>
        <span className="text-default-400 text-xs">{total} total</span>
      </div>

      {isLoading && runs.length === 0 && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}

      {!isLoading && runs.length === 0 && (
        <p className="text-default-400 py-4 text-center text-xs">
          No runs yet.
        </p>
      )}

      <div className="border-default-200 rounded-lg border dark:border-white/10">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-2 flex justify-center">
          <Button
            size="sm"
            variant="flat"
            onPress={() => setOffset((prev) => prev + limit)}
            isLoading={isLoading}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
