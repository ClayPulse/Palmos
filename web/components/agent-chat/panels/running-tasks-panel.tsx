"use client";

import { WorkflowTaskCard } from "@/components/agent-chat/cards/workflow-task-card";
import type {
  FilterKey,
  RunningTasksPanelProps,
  TaskItem,
  TasksOverlayProps,
  WorkflowTaskState,
} from "@/components/agent-chat/types";
import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";
import { Spinner } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";

/**
 * Derive the latest progress string from a task's result log.
 * The status endpoint populates `result.log` with entries like
 * `{ type: "tool_use", tool: "..." }` and `{ type: "message", text: "..." }`.
 */
function deriveLatestProgress(task: TaskItem): string | undefined {
  const log = task.result?.log as
    | { type: string; text?: string; tool?: string; output?: string }[]
    | undefined;
  if (!log || log.length === 0) return undefined;
  const last = log[log.length - 1];
  if (last.type === "tool_use") return `Using tool: ${last.tool}`;
  if (last.type === "tool_result" && last.output) return last.output;
  if (last.text) return last.text;
  return undefined;
}

function toWorkflowTaskState(task: TaskItem): WorkflowTaskState {
  return {
    taskId: task.taskId,
    workflowName: task.workflowName,
    startedAt: task.createdAt,
    status: task.status === "pending" ? "running" : task.status,
    result: task.result,
    error: task.error ?? undefined,
    isManagedAgent: task.isManagedAgent,
    latestProgress: deriveLatestProgress(task),
  };
}

export default function RunningTasksPanel({
  isPage,
  onClose,
}: TasksOverlayProps) {
  if (isPage) {
    return (
      <div className="absolute inset-0 z-30 flex">
        <div className="w-full max-w-sm">
          <RunningTasks onClose={onClose} />
        </div>
        <div
          className="flex-1 bg-black/20 dark:bg-black/40"
          onClick={onClose}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30">
      <RunningTasks onClose={onClose} />
    </div>
  );
}

function RunningTasks({ onClose }: RunningTasksPanelProps) {
  const { getTranslations: t } = useTranslations();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [terminatingIds, setTerminatingIds] = useState<Set<string>>(new Set());

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchTasks = useCallback(async () => {
    if (!backendUrl) return;
    try {
      const res = await fetch(`${backendUrl}/api/workflow/run/list-tasks`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  // Poll running tasks for latest status/progress
  useEffect(() => {
    if (!backendUrl) return;
    const runningTasks = tasks.filter(
      (t) => t.status === "running" || t.status === "pending",
    );
    if (runningTasks.length === 0) return;

    const interval = setInterval(async () => {
      for (const task of runningTasks) {
        try {
          const res = await fetch(
            `${backendUrl}/api/workflow/run/status?taskId=${task.taskId}`,
            { credentials: "include" },
          );
          if (!res.ok) continue;
          const data = await res.json();
          setTasks((prev) =>
            prev.map((t) =>
              t.taskId === task.taskId
                ? {
                    ...t,
                    status: data.status,
                    result: data.result,
                    error: data.error,
                    completedAt: data.completedAt,
                  }
                : t,
            ),
          );
        } catch {
          // silent
        }
      }
    }, 5_000);
    return () => clearInterval(interval);
  }, [backendUrl, tasks]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15_000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleTerminate = async (taskId: string) => {
    if (!backendUrl) return;
    setTerminatingIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`${backendUrl}/api/workflow/run/terminate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } finally {
      setTerminatingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const filtered =
    filter === "all"
      ? tasks
      : filter === "running"
        ? tasks.filter((t) => t.status === "running" || t.status === "pending")
        : tasks.filter((t) => t.status === filter);

  const runningCount = tasks.filter(
    (t) => t.status === "running" || t.status === "pending",
  ).length;

  const filterButtons: { key: FilterKey; label: string }[] = [
    { key: "all", label: `${t("runningTasksPanel.all")} (${tasks.length})` },
    {
      key: "running",
      label: `${t("runningTasksPanel.running")} (${runningCount})`,
    },
    { key: "completed", label: t("runningTasksPanel.done") },
    { key: "failed", label: t("runningTasksPanel.failed") },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-[#111118]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-300/40 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-white/3">
        <div className="flex items-center gap-2">
          <Icon
            name="task_alt"
            variant="round"
            className="text-base text-amber-500"
          />
          <span className="text-default-800 text-sm font-semibold dark:text-white/85">
            {t("runningTasksPanel.tasks")}
          </span>
          {runningCount > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {runningCount} {t("runningTasksPanel.runningCount")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchTasks}
            className="text-default-400 hover:text-default-600 rounded-md p-1 transition-colors dark:text-white/40 dark:hover:text-white/70"
          >
            <Icon name="refresh" variant="round" className="text-sm" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-default-400 hover:text-default-600 rounded-md p-1 transition-colors dark:text-white/40 dark:hover:text-white/70"
            >
              <Icon name="close" variant="round" className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="border-default-200/60 flex gap-1 border-b px-3 py-1.5 dark:border-white/6">
        {filterButtons.map((fb) => (
          <button
            key={fb.key}
            onClick={() => setFilter(fb.key)}
            className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
              filter === fb.key
                ? "bg-amber-100 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                : "text-default-500 hover:bg-default-100 dark:text-white/50 dark:hover:bg-white/8"
            }`}
          >
            {fb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-default-400 py-8 text-center text-xs dark:text-white/40">
            {filter === "all"
              ? t("runningTasksPanel.noTasks")
              : t("runningTasksPanel.noFilteredTasks", { filter })}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((task) => (
              <WorkflowTaskCard
                key={task.taskId}
                task={toWorkflowTaskState(task)}
                isTerminating={terminatingIds.has(task.taskId)}
                onTerminate={
                  task.status === "running" || task.status === "pending"
                    ? handleTerminate
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
