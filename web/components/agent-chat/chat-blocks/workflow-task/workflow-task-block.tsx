"use client";

import Icon from "@/components/misc/icon";
import WorkflowEnvSetupModal from "@/components/modals/workflow-env-setup-modal";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useWorkflowEnvCheck } from "@/lib/hooks/use-workflow-env-check";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import type { Workflow, WorkflowTaskState } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { Spinner } from "@heroui/react";
import { useContext, useEffect, useState } from "react";

interface BlobResult {
  __blobUrl: string;
  mime: string;
}

interface AgentProgressLogEntry {
  type: string;
  text?: string;
  tool?: string;
  output?: string;
}

export function WorkflowTaskBlock({
  task,
  onTerminate,
  isTerminating,
}: {
  task: WorkflowTaskState;
  onTerminate?: (taskId: string) => void;
  isTerminating?: boolean;
}) {
  const { getTranslations: t } = useTranslations();
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

  const isLoading = task.status === "loading";
  const isRunning = task.status === "running";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";

  return (
    <div
      className={`shrink-0 rounded-xl border shadow-sm ${
        isLoading
          ? "border-default-200 bg-default-50/60 dark:border-white/10 dark:bg-white/3"
          : isRunning
            ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5"
            : isCompleted
              ? "border-green-300/60 bg-green-50/50 dark:border-green-500/30 dark:bg-green-500/5"
              : "border-red-300/60 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/5"
      }`}
    >
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        {isLoading || isRunning ? (
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
            {isLoading
              ? "Loading workflow…"
              : isRunning
                ? t("workflowTaskCard.running", { time: timeStr })
                : isCompleted
                  ? t("workflowTaskCard.completed", { time: timeStr })
                  : t("workflowTaskCard.failed", { time: timeStr })}
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
            disabled={isTerminating}
            className="shrink-0 rounded-md border border-red-300/60 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            {isTerminating ? (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" classNames={{ wrapper: "h-3 w-3" }} />
                {t("workflowTaskCard.terminating")}
              </span>
            ) : (
              t("workflowTaskCard.terminate")
            )}
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

export function WorkflowResultBody({
  result,
  workflowName,
}: {
  result: any;
  workflowName: string;
}) {
  const { getTranslations: t } = useTranslations();
  // Check for publishedWorkflowId — workflow build complete
  const publishedId = findPublishedWorkflowId(result);
  if (publishedId) {
    return (
      <WorkflowBuiltCard
        publishedId={publishedId}
        workflowName={workflowName}
      />
    );
  }

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

  // Check for blob-uploaded file result (large files uploaded to Azure storage)
  const blobResult = findBlobResult(result);
  if (blobResult) {
    return (
      <BlobResultBody blobResult={blobResult} workflowName={workflowName} />
    );
  }

  // Check for data URI (file result — inline base64, for smaller files)
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
            {t("common.open")}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-md border border-green-300/60 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
          >
            <Icon name="download" variant="round" className="text-xs" />
            {t("workflowTaskCard.download")}
          </button>
        </div>
      </div>
    );
  }

  // Default: text/JSON result
  const textContent =
    typeof result === "string" ? result : JSON.stringify(result, null, 2);

  // Parse workflow name from YAML-like output: workflow:\n  name: (name)
  const parsedWorkflowName = parseWorkflowName(textContent);

  return (
    <div className="border-t border-green-200/60 bg-white/60 px-3.5 py-2 dark:border-green-500/15 dark:bg-white/3">
      <pre className="text-default-700 max-h-48 overflow-auto text-xs break-all whitespace-pre-wrap dark:text-white/70">
        {textContent}
      </pre>
      {parsedWorkflowName && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("workflow", parsedWorkflowName);
              window.location.href = url.toString();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-green-300/60 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
          >
            <Icon name="open_in_new" variant="round" className="text-sm" />
            Open {parsedWorkflowName}
          </button>
        </div>
      )}
    </div>
  );
}

/** Parse `workflow:\n  name: <name>` from result text */
function parseWorkflowName(text: string): string | null {
  const match = text.match(/workflow:\s*\n\s*name:\s*(.+)/);
  return match ? match[1].trim() : null;
}

// ── Agent progress log ──────────────────────────────────────────────────────

function AgentProgressLog({ log }: { log: AgentProgressLogEntry[] }) {
  const { getTranslations: t } = useTranslations();
  const [expanded, setExpanded] = useState(false);

  if (!log || log.length === 0) return null;

  const lastEntry = log[log.length - 1];

  return (
    <div className="border-t border-amber-200/60 bg-white/60 px-3.5 py-2 dark:border-amber-500/15 dark:bg-white/3">
      {/* Header: count + expand toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="text-default-400 hover:text-default-600 mb-1 flex w-full items-center gap-1.5 text-[10px] transition-colors dark:text-white/40 dark:hover:text-white/60"
      >
        <Icon
          name={expanded ? "expand_less" : "expand_more"}
          variant="round"
          className="text-xs"
        />
        <span>
          {log.length} {t("workflowTaskCard.messages", { count: log.length })}
          {!expanded && ` — ${t("workflowTaskCard.latest")}`}
        </span>
      </button>

      {expanded ? (
        <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
          {log.map((entry, i) => {
            // Skip tool_result entries — they render inline with their tool_use
            if (entry.type === "tool_result") return null;
            const nextEntry = log[i + 1];
            const toolOutput =
              entry.type === "tool_use" && nextEntry?.type === "tool_result"
                ? nextEntry.output
                : undefined;
            return <LogEntry key={i} entry={entry} toolOutput={toolOutput} />;
          })}
        </div>
      ) : (
        (() => {
          // For collapsed view, find the last meaningful entry (skip tool_result)
          for (let i = log.length - 1; i >= 0; i--) {
            const entry = log[i];
            if (entry.type === "tool_result") {
              // If preceded by a tool_use, show tool_use with output
              if (i > 0 && log[i - 1].type === "tool_use") {
                return (
                  <LogEntry entry={log[i - 1]} toolOutput={entry.output} />
                );
              }
              continue;
            }
            // For tool_use, check if next entry is a tool_result with output
            if (entry.type === "tool_use") {
              const next = log[i + 1];
              const toolOutput =
                next?.type === "tool_result" ? next.output : undefined;
              return <LogEntry entry={entry} toolOutput={toolOutput} />;
            }
            return <LogEntry entry={entry} />;
          }
          return <LogEntry entry={log[log.length - 1]} />;
        })()
      )}
    </div>
  );
}

function LogEntry({
  entry,
  toolOutput,
}: {
  entry: AgentProgressLogEntry;
  toolOutput?: string;
}) {
  const { getTranslations: t } = useTranslations();
  const [showOutput, setShowOutput] = useState(false);

  if (entry.type === "tool_use") {
    return (
      <div>
        <div className="flex items-center gap-1.5 text-xs">
          <Icon
            name="build"
            variant="round"
            className="shrink-0 text-xs text-amber-500 dark:text-amber-400"
          />
          <span className="text-default-600 min-w-0 flex-1 break-words dark:text-white/60">
            {t("workflowTaskCard.usingTool")}{" "}
            <span className="font-medium text-amber-700 dark:text-amber-300">
              {entry.tool}
            </span>
          </span>
          {toolOutput && (
            <button
              onClick={() => setShowOutput((p) => !p)}
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10"
            >
              {showOutput
                ? t("workflowTaskCard.hide")
                : t("workflowTaskCard.seeOutput")}
            </button>
          )}
        </div>
        {showOutput && toolOutput && (
          <div className="mt-1 ml-5 rounded border border-green-200/60 bg-green-50/50 px-2.5 py-1.5 dark:border-green-500/15 dark:bg-green-500/5">
            <pre className="text-default-600 max-h-32 overflow-auto text-[11px] break-words whitespace-pre-wrap dark:text-white/60">
              {toolOutput}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 text-xs">
      <Icon
        name="chat_bubble"
        variant="round"
        className="mt-0.5 shrink-0 text-xs text-blue-500 dark:text-blue-400"
      />
      <span className="text-default-600 min-w-0 break-words whitespace-pre-wrap dark:text-white/60">
        {entry.text}
      </span>
    </div>
  );
}

// ── Workflow result body ─────────────────────────────────────────────────────

/** Match `data:<mime>;base64,<payload>` */
const DATA_URI_RE = /^data:([^;]+);base64,(.+)$/;

/** Walk an object recursively and find the first blob-upload marker */
function findBlobResult(obj: any): BlobResult | null {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const rec = obj as Record<string, unknown>;
    if (typeof rec.__blobUrl === "string" && typeof rec.mime === "string") {
      return { __blobUrl: rec.__blobUrl, mime: rec.mime };
    }
    for (const val of Object.values(rec)) {
      const found = findBlobResult(val);
      if (found) return found;
    }
  }
  if (Array.isArray(obj)) {
    for (const val of obj) {
      const found = findBlobResult(val);
      if (found) return found;
    }
  }
  return null;
}

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
  obj: any,
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
function findError(obj: any): string | null {
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

/** Fetches a signed URL from the backend, then opens or downloads via that URL. */
async function getSignedBlobUrl(blobUrl: string): Promise<string> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/result-file?url=${encodeURIComponent(blobUrl)}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to get signed URL");
  const { signedUrl } = await res.json();
  return signedUrl;
}

function BlobResultBody({
  blobResult,
  workflowName,
}: {
  blobResult: BlobResult;
  workflowName: string;
}) {
  const { getTranslations: t } = useTranslations();
  const suffix = mimeToSuffix(blobResult.mime);
  const isImage = /^image\//.test(blobResult.mime);
  const fileName = `${workflowName.replace(/[^a-zA-Z0-9_-]/g, "_")}.${suffix}`;

  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Eagerly fetch a signed URL for image preview
  useEffect(() => {
    if (isImage) {
      getSignedBlobUrl(blobResult.__blobUrl)
        .then(setSignedUrl)
        .catch(() => {});
    }
  }, [blobResult.__blobUrl, isImage]);

  const handleOpen = async () => {
    try {
      const url = signedUrl ?? (await getSignedBlobUrl(blobResult.__blobUrl));
      window.open(url, "_blank");
    } catch {
      // fallback
      window.open(blobResult.__blobUrl, "_blank");
    }
  };

  const handleDownload = async () => {
    try {
      const url = signedUrl ?? (await getSignedBlobUrl(blobResult.__blobUrl));
      // Fetch the file and create a local blob URL so the download attribute works
      // (cross-origin URLs ignore the download attribute and open in a new tab)
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // fallback
      window.open(blobResult.__blobUrl, "_blank");
    }
  };

  return (
    <div className="border-t border-green-200/60 bg-white/60 dark:border-green-500/15 dark:bg-white/3">
      {isImage && signedUrl && (
        <div className="flex justify-center px-3.5 pt-3">
          <img
            src={signedUrl}
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
          {t("common.open")}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 rounded-md border border-green-300/60 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
        >
          <Icon name="download" variant="round" className="text-xs" />
          {t("workflowTaskCard.download")}
        </button>
      </div>
    </div>
  );
}

/** Walk an object/string to find a publishedWorkflowId from managed agent output */
function findPublishedWorkflowId(obj: any): string | null {
  if (typeof obj === "string") {
    // Try JSON parse from agent final message
    try {
      const parsed = JSON.parse(obj);
      if (typeof parsed.publishedWorkflowId === "string")
        return parsed.publishedWorkflowId;
    } catch {
      // Try regex match
      const m = obj.match(/"publishedWorkflowId"\s*:\s*"([^"]+)"/);
      if (m) return m[1];
    }
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const rec = obj as Record<string, unknown>;
    if (typeof rec.publishedWorkflowId === "string")
      return rec.publishedWorkflowId;
    for (const val of Object.values(rec)) {
      const found = findPublishedWorkflowId(val);
      if (found) return found;
    }
  }
  if (Array.isArray(obj)) {
    for (const val of obj) {
      const found = findPublishedWorkflowId(val);
      if (found) return found;
    }
  }
  return null;
}

export function WorkflowBuiltCard({
  publishedId,
  workflowName,
}: {
  publishedId: string;
  workflowName: string;
}) {
  const { getTranslations: t } = useTranslations();
  const { createCanvasTabView } = useTabViewManager();
  const { submit } = useChatContext();
  const editorContext = useContext(EditorContext);
  const [isOpening, setIsOpening] = useState(false);
  const { envSetup, checkMissingEnvs, openEnvSetup, closeEnvSetup } =
    useWorkflowEnvCheck();
  const [missingEnvs, setMissingEnvs] = useState<Record<string, string> | null>(
    null,
  );
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [missing, res] = await Promise.all([
        checkMissingEnvs(publishedId),
        fetchAPI(
          `/api/workflow/get?name=${encodeURIComponent(workflowName)}&latest=true`,
        ),
      ]);
      if (cancelled) return;
      setMissingEnvs(missing);
      if (res.ok) {
        const wf: Workflow = await res.json();
        if (!cancelled) setWorkflow(wf);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publishedId, workflowName, checkMissingEnvs]);

  async function openInEditor() {
    setIsOpening(true);
    try {
      let wf = workflow;
      if (!wf) {
        const res = await fetchAPI(
          `/api/workflow/get?name=${encodeURIComponent(workflowName)}&latest=true`,
        );
        if (!res.ok) return;
        wf = await res.json();
        setWorkflow(wf);
      }
      if (!wf) return;
      await createCanvasTabView(
        {
          viewId: createCanvasViewId(),
          appConfigs: wf.content.nodes.map((n) => n.data.config),
          initialWorkflowContent: wf.content,
        },
        wf,
      );
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        appMode: AppModeEnum.Editor,
      }));
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="border-t border-green-200/60 bg-white/60 px-3.5 py-3 dark:border-green-500/15 dark:bg-white/3">
      <div className="flex items-center gap-2.5">
        <Icon
          name="rocket_launch"
          variant="round"
          className="text-xl text-green-600 dark:text-green-400"
        />
        <div className="min-w-0 flex-1">
          <p className="text-default-800 text-sm font-medium dark:text-white/85">
            {t("workflowTaskCard.workflowBuilt")}
          </p>
          <p className="text-default-500 flex items-center gap-1.5 text-xs dark:text-white/50">
            <span className="truncate">{workflowName}</span>
            {workflow?.version && (
              <span className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-green-700 dark:bg-green-500/15 dark:text-green-300">
                v{workflow.version}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={openInEditor}
          disabled={isOpening}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
        >
          {isOpening ? (
            <Spinner size="sm" classNames={{ wrapper: "h-3.5 w-3.5" }} />
          ) : (
            <Icon name="edit" variant="round" className="text-sm" />
          )}
          {t("workflowTaskCard.openInEditor")}
        </button>
        <button
          onClick={() =>
            submit(
              `I'd like to run the workflow "${workflowName}" (id: ${publishedId}). How would you like to run it?`,
            )
          }
          className="flex items-center gap-1.5 rounded-lg border border-green-300/60 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
        >
          <Icon name="play_arrow" variant="round" className="text-sm" />
          {t("workflowTaskCard.runWorkflow")}
        </button>
        {missingEnvs && Object.keys(missingEnvs).length > 0 && (
          <button
            onClick={() => openEnvSetup(publishedId, missingEnvs)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
          >
            <Icon name="key" variant="round" className="text-sm" />
            {t("workflowTaskCard.setupEnvs")}
          </button>
        )}
      </div>
      {envSetup && (
        <WorkflowEnvSetupModal
          isOpen={envSetup.isOpen}
          onClose={closeEnvSetup}
          onComplete={() => {
            closeEnvSetup();
            setMissingEnvs(null);
          }}
          workflowId={envSetup.workflowId}
          envEntries={envSetup.env}
        />
      )}
    </div>
  );
}
