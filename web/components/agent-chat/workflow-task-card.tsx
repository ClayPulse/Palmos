"use client";

import type { WorkflowTaskState } from "@/components/agent-chat/helpers";
import Icon from "@/components/misc/icon";
import { Spinner } from "@heroui/react";
import { useEffect, useState } from "react";

export function WorkflowTaskCard({
  task,
  onTerminate,
}: {
  task: WorkflowTaskState;
  onTerminate?: (taskId: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (task.status !== "running") {
      setFinalElapsed((prev) =>
        prev !== null ? prev : Math.floor((Date.now() - task.startedAt) / 1000),
      );
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - task.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [task.status, task.startedAt]);

  const displayElapsed =
    task.status === "running" ? elapsed : (finalElapsed ?? elapsed);
  const minutes = Math.floor(displayElapsed / 60);
  const seconds = displayElapsed % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const isRunning = task.status === "running";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";

  return (
    <div
      className={`shrink-0 rounded-xl border shadow-sm ${
        isRunning
          ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5"
          : isCompleted
            ? "border-green-300/60 bg-green-50/50 dark:border-green-500/30 dark:bg-green-500/5"
            : "border-red-300/60 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/5"
      }`}
    >
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        {isRunning ? (
          <Spinner size="sm" />
        ) : isCompleted ? (
          <Icon
            name="check_circle"
            variant="round"
            className="text-lg text-green-500 dark:text-green-400"
          />
        ) : (
          <Icon
            name="error"
            variant="round"
            className="text-lg text-red-500 dark:text-red-400"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-default-800 truncate text-sm font-medium dark:text-white/85">
            {task.workflowName}
          </p>
          <p className="text-default-500 text-xs dark:text-white/50">
            {isRunning
              ? `Running... ${timeStr}`
              : isCompleted
                ? `Completed in ${timeStr}`
                : `Failed after ${timeStr}`}
          </p>
          {isRunning && task.latestProgress && (
            <p className="text-default-500 mt-0.5 truncate text-xs italic dark:text-white/40">
              {task.latestProgress}
            </p>
          )}
        </div>
        {isRunning && onTerminate && (
          <button
            onClick={() => onTerminate(task.taskId)}
            className="shrink-0 rounded-md border border-red-300/60 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            Terminate
          </button>
        )}
      </div>
      {isRunning && task.result?.log && (
        <AgentProgressLog log={task.result.log} />
      )}
      {isCompleted && task.result != null && (
        <WorkflowResultBody
          result={task.result}
          workflowName={task.workflowName}
        />
      )}
      {isFailed && task.error && (
        <div className="border-t border-red-200/60 bg-white/60 px-3.5 py-2 dark:border-red-500/15 dark:bg-white/3">
          <p className="text-xs text-red-600 dark:text-red-400">{task.error}</p>
        </div>
      )}
    </div>
  );
}

// ── Agent progress log ──────────────────────────────────────────────────────

function AgentProgressLog({
  log,
}: {
  log: { type: string; text?: string; tool?: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (!log || log.length === 0) return null;

  const lastEntry = log[log.length - 1];

  return (
    <div className="border-t border-amber-200/60 bg-white/60 px-3.5 py-2 dark:border-amber-500/15 dark:bg-white/3">
      {/* Header: count + expand toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="mb-1 flex w-full items-center gap-1.5 text-[10px] text-default-400 transition-colors hover:text-default-600 dark:text-white/40 dark:hover:text-white/60"
      >
        <Icon
          name={expanded ? "expand_less" : "expand_more"}
          variant="round"
          className="text-xs"
        />
        <span>
          {log.length} message{log.length !== 1 ? "s" : ""}
          {!expanded && " — latest:"}
        </span>
      </button>

      {expanded ? (
        <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
          {log.map((entry, i) => (
            <LogEntry key={i} entry={entry} />
          ))}
        </div>
      ) : (
        <LogEntry entry={lastEntry} />
      )}
    </div>
  );
}

function LogEntry({
  entry,
}: {
  entry: { type: string; text?: string; tool?: string };
}) {
  return (
    <div className="flex items-start gap-1.5 text-xs">
      {entry.type === "tool_use" ? (
        <>
          <Icon
            name="build"
            variant="round"
            className="mt-0.5 shrink-0 text-xs text-amber-500 dark:text-amber-400"
          />
          <span className="text-default-600 break-words dark:text-white/60">
            Using tool:{" "}
            <span className="font-medium text-amber-700 dark:text-amber-300">
              {entry.tool}
            </span>
          </span>
        </>
      ) : (
        <>
          <Icon
            name="chat_bubble"
            variant="round"
            className="mt-0.5 shrink-0 text-xs text-blue-500 dark:text-blue-400"
          />
          <span className="text-default-600 min-w-0 break-words whitespace-pre-wrap dark:text-white/60">
            {entry.text}
          </span>
        </>
      )}
    </div>
  );
}

// ── Workflow result body ─────────────────────────────────────────────────────

/** Match `data:<mime>;base64,<payload>` */
const DATA_URI_RE = /^data:([^;]+);base64,(.+)$/;

/** Map MIME to a human-friendly extension */
function mimeToSuffix(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
    "text/plain": "txt",
    "application/json": "json",
    "text/html": "html",
    "application/zip": "zip",
  };
  return map[mime] ?? mime.split("/").pop() ?? "bin";
}

/**
 * Walk an object recursively and find the first data-URI string.
 * Returns { mime, base64, dataUri } or null.
 */
function findDataUri(
  obj: unknown,
): { mime: string; base64: string; dataUri: string } | null {
  if (typeof obj === "string") {
    const m = obj.match(DATA_URI_RE);
    if (m) return { mime: m[1], base64: m[2], dataUri: obj };
  }
  if (obj && typeof obj === "object") {
    for (const val of Object.values(obj)) {
      const found = findDataUri(val);
      if (found) return found;
    }
  }
  return null;
}

/** Check if the result (or any nested value) contains an error field */
function findError(obj: unknown): string | null {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const rec = obj as Record<string, unknown>;
    if (typeof rec.error === "string" && rec.error) return rec.error;
    for (const val of Object.values(rec)) {
      const found = findError(val);
      if (found) return found;
    }
  }
  return null;
}

export function WorkflowResultBody({
  result,
  workflowName,
}: {
  result: unknown;
  workflowName: string;
}) {
  // Check for error in the result object
  const errorMsg = findError(result);
  if (errorMsg) {
    return (
      <div className="border-t border-red-200/60 bg-white/60 px-3.5 py-2 dark:border-red-500/15 dark:bg-white/3">
        <p className="text-xs font-medium text-red-600 dark:text-red-400">
          {errorMsg}
        </p>
      </div>
    );
  }

  // Check for data URI (file result)
  const dataUri = findDataUri(result);
  if (dataUri) {
    const suffix = mimeToSuffix(dataUri.mime);
    const isImage = /^image\//.test(dataUri.mime);
    const fileName = `${workflowName.replace(/[^a-zA-Z0-9_-]/g, "_")}.${suffix}`;

    const toBlob = () => {
      const byteChars = atob(dataUri.base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      return new Blob([byteArray], { type: dataUri.mime });
    };

    const handleOpen = () => {
      const url = URL.createObjectURL(toBlob());
      window.open(url, "_blank");
    };

    const handleDownload = () => {
      const url = URL.createObjectURL(toBlob());
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="border-t border-green-200/60 bg-white/60 dark:border-green-500/15 dark:bg-white/3">
        {isImage && (
          <div className="flex justify-center px-3.5 pt-3">
            <img
              src={dataUri.dataUri}
              alt={workflowName}
              className="max-h-64 rounded-lg object-contain"
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <Icon
            name={isImage ? "image" : "description"}
            variant="round"
            className="text-base text-green-600 dark:text-green-400"
          />
          <span className="text-default-700 min-w-0 flex-1 truncate text-xs dark:text-white/70">
            {fileName}
          </span>
          <button
            onClick={handleOpen}
            className="flex items-center gap-1 rounded-md border border-green-300/60 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
          >
            <Icon name="open_in_new" variant="round" className="text-xs" />
            Open
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-md border border-green-300/60 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
          >
            <Icon name="download" variant="round" className="text-xs" />
            Download
          </button>
        </div>
      </div>
    );
  }

  // Default: text/JSON result
  const textContent =
    typeof result === "string" ? result : JSON.stringify(result, null, 2);

  return (
    <div className="border-t border-green-200/60 bg-white/60 px-3.5 py-2 dark:border-green-500/15 dark:bg-white/3">
      <pre className="text-default-700 max-h-48 overflow-auto text-xs break-all whitespace-pre-wrap dark:text-white/70">
        {textContent}
      </pre>
    </div>
  );
}
