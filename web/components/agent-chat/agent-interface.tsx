"use client";

import type { WorkflowTaskState } from "@/components/agent-chat/helpers";
import HomeScreen from "@/components/agent-chat/initial-chat-screens/home-screen";
import ProjectScreen from "@/components/agent-chat/initial-chat-screens/project-screen";
import { AIResponseCard, ResponseCard, UserBubble } from "@/components/agent-chat/message-bubbles";
import { SessionHistoryPanel } from "@/components/agent-chat/session-history";
import { SubagentCard } from "@/components/agent-chat/subagent-card";
import { TodoList } from "@/components/agent-chat/todo-list";
import InterruptCard from "@/components/agent-chat/interrupt-card";
import RunningTasksPanel from "@/components/agent-chat/running-tasks-panel";
import { WorkflowTaskCard } from "@/components/agent-chat/workflow-task-card";
import InlineWidget, {
  type InlineWidgetData,
  parseWidgetFromToolCall,
  parseWidgetFromToolMessage,
} from "@/components/agent-chat/inline-widget";
import KnowledgeFiles from "@/components/agent-chat/knowledge-files";
import ProjectPicker from "@/components/agent-chat/project-picker";
import Icon from "@/components/misc/icon";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import type { WorkflowInput } from "@/lib/types";
import { Button, Spinner, Tooltip } from "@heroui/react";
import { AIMessage } from "@langchain/core/messages";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { motion } from "framer-motion";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

/** Walk an object recursively to find a publishedWorkflowId */
function extractPublishedWorkflowId(obj: unknown): string | null {
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      if (typeof parsed.publishedWorkflowId === "string") return parsed.publishedWorkflowId;
    } catch {
      const m = obj.match(/"publishedWorkflowId"\s*:\s*"([^"]+)"/);
      if (m) return m[1];
    }
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const rec = obj as Record<string, unknown>;
    if (typeof rec.publishedWorkflowId === "string") return rec.publishedWorkflowId;
    for (const val of Object.values(rec)) {
      const found = extractPublishedWorkflowId(val);
      if (found) return found;
    }
  }
  if (Array.isArray(obj)) {
    for (const val of obj) {
      const found = extractPublishedWorkflowId(val);
      if (found) return found;
    }
  }
  return null;
}

export interface AIChatInterfaceProps {
  /** "panel" = narrow side-panel chrome; "page" = full-page layout */
  variant?: "panel" | "page";
  /** Callback for the close button (panel variant only) */
  onClose?: () => void;
}

export default function AgentChat({
  variant = "panel",
  onClose,
}: AIChatInterfaceProps) {
  const {
    messages,
    isLoading,
    error,
    todos,
    submit,
    stop,
    sessions,
    currentSessionIdRef,
    handleNewChat,
    handleSwitchSession,
    handleDeleteSession,
    getSubagentsByMessage,
    isLoadingSession,
    workflowBuilds,
    saveWorkflowBuild,
    activeInterrupt,
    resume,
  } = useChatContext();

  const editorContext = useContext(EditorContext);
  const projects = editorContext?.editorStates.projectsInfo;
  const { workflows: myWorkflows } = useMarketplaceWorkflows("My Workflows");

  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const isPage = variant === "page";

  // ── File uploads ────────────────────────────────────────────────────────
  interface ChatUpload {
    id: string; // server-assigned ID once uploaded; temp key while pending
    filename: string;
    sizeBytes: number;
    status: "uploading" | "processing" | "ready" | "error";
    error?: string;
    progress: number; // 0–100 upload progress percentage
    tempKey: string; // stable local key for React + in-flight tracking
    indexed?: boolean; // true if saved to RAG
    indexing?: boolean; // true while indexing in progress
  }
  const [uploads, setUploads] = useState<ChatUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  function uploadSingleFile(file: File, backendUrl: string): Promise<void> {
    const tempKey = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setUploads((prev) => [
      ...prev,
      {
        id: tempKey,
        filename: file.name,
        sizeBytes: file.size,
        status: "uploading",
        progress: 0,
        tempKey,
      },
    ]);

    return new Promise<void>((resolve) => {
      const form = new FormData();
      form.append("file", file);
      if (messages.length > 0 && currentSessionIdRef.current) {
        form.append("sessionId", currentSessionIdRef.current);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${backendUrl}/api/chat/upload`);
      xhr.withCredentials = true;

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) =>
            prev.map((u) =>
              u.tempKey === tempKey ? { ...u, progress: pct } : u,
            ),
          );
        }
      });

      // All bytes sent — server is now processing (storage / RAG)
      xhr.upload.addEventListener("loadend", () => {
        setUploads((prev) =>
          prev.map((u) =>
            u.tempKey === tempKey
              ? { ...u, status: "processing", progress: 100 }
              : u,
          ),
        );
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { id: string };
            setUploads((prev) =>
              prev.map((u) =>
                u.tempKey === tempKey
                  ? { ...u, id: data.id, status: "ready", progress: 100 }
                  : u,
              ),
            );
          } catch {
            setUploads((prev) =>
              prev.map((u) =>
                u.tempKey === tempKey
                  ? { ...u, status: "error", error: "Invalid server response" }
                  : u,
              ),
            );
          }
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try {
            const data = JSON.parse(xhr.responseText);
            if (data?.error) msg = data.error;
          } catch {
            /* ignore */
          }
          setUploads((prev) =>
            prev.map((u) =>
              u.tempKey === tempKey ? { ...u, status: "error", error: msg } : u,
            ),
          );
        }
        resolve();
      });

      xhr.addEventListener("error", () => {
        setUploads((prev) =>
          prev.map((u) =>
            u.tempKey === tempKey
              ? { ...u, status: "error", error: "Network error" }
              : u,
          ),
        );
        resolve();
      });

      xhr.send(form);
    });
  }

  async function uploadFiles(selected: File[]) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error("NEXT_PUBLIC_BACKEND_URL is not set");
      return;
    }
    await Promise.all(selected.map((file) => uploadSingleFile(file, backendUrl)));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    e.target.value = ""; // reset so selecting the same file again triggers change
    await uploadFiles(selected);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (isLoading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    await uploadFiles(files);
  }

  async function handleRemoveUpload(upload: ChatUpload) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    setUploads((prev) => prev.filter((u) => u.tempKey !== upload.tempKey));
    if (upload.status === "ready" && backendUrl) {
      try {
        await fetch(`${backendUrl}/api/chat/uploads/${upload.id}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch {
        // Best-effort cleanup — the UI has already removed it.
      }
    }
  }

  async function handleIndexUpload(upload: ChatUpload) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl || upload.indexed || upload.indexing) return;
    setUploads((prev) =>
      prev.map((u) =>
        u.tempKey === upload.tempKey ? { ...u, indexing: true } : u,
      ),
    );
    try {
      const res = await fetch(
        `${backendUrl}/api/chat/uploads/${upload.id}/index`,
        { method: "POST", credentials: "include" },
      );
      if (res.ok) {
        setUploads((prev) =>
          prev.map((u) =>
            u.tempKey === upload.tempKey
              ? { ...u, indexed: true, indexing: false }
              : u,
          ),
        );
      } else {
        setUploads((prev) =>
          prev.map((u) =>
            u.tempKey === upload.tempKey ? { ...u, indexing: false } : u,
          ),
        );
      }
    } catch {
      setUploads((prev) =>
        prev.map((u) =>
          u.tempKey === upload.tempKey ? { ...u, indexing: false } : u,
        ),
      );
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const attachmentChips =
    uploads.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {uploads.map((u) => {
          const chip = (
            <div
              className={`relative overflow-hidden rounded-md border text-xs ${
                u.status === "error"
                  ? "border-red-300/60 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10"
                  : "border-amber-300/60 bg-amber-50/80 dark:border-white/15 dark:bg-white/8"
              }`}
            >
              <div className="relative flex items-center gap-1.5 px-2 py-1">
                {u.status === "uploading" ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-amber-200/60 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-[width] duration-200 ease-out dark:bg-amber-400"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
                      {u.progress}%
                    </span>
                  </div>
                ) : u.status === "processing" ? (
                  <Spinner size="sm" />
                ) : u.status === "error" ? (
                  <Icon
                    name="error_outline"
                    variant="round"
                    className="text-sm text-red-500"
                  />
                ) : (
                  <Icon
                    name="description"
                    variant="round"
                    className="text-sm text-amber-600 dark:text-amber-400"
                  />
                )}
                <span className="text-default-800 max-w-[12rem] truncate dark:text-white/85">
                  {u.filename}
                </span>
                {u.status === "ready" && !u.indexed && !u.indexing && (
                  <Tooltip content="Save to knowledge" delay={300} closeDelay={0}>
                    <button
                      className="text-gray-400 hover:text-amber-600 dark:text-white/40 dark:hover:text-amber-400"
                      onClick={() => handleIndexUpload(u)}
                      aria-label="Save to knowledge"
                    >
                      <Icon name="cloud_upload" variant="round" className="text-xs" />
                    </button>
                  </Tooltip>
                )}
                {u.indexing && <Spinner size="sm" />}
                {u.indexed && (
                  <Tooltip content="Saved to knowledge" delay={300} closeDelay={0}>
                    <Icon
                      name="check_circle"
                      variant="round"
                      className="text-xs text-green-500 dark:text-green-400"
                    />
                  </Tooltip>
                )}
                <button
                  className="text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/80"
                  onClick={() => handleRemoveUpload(u)}
                  aria-label="Remove attachment"
                >
                  <Icon name="close" variant="round" className="text-xs" />
                </button>
              </div>
            </div>
          );

          if (u.status === "error") {
            return (
              <Tooltip
                key={u.tempKey}
                content={
                  <div className="max-w-xs px-1 py-0.5 text-xs">
                    <p className="mb-0.5 font-semibold text-red-500">
                      Upload failed
                    </p>
                    <p className="text-default-700 break-words dark:text-white/80">
                      {u.error ?? "Unknown error"}
                    </p>
                  </div>
                }
                delay={200}
                closeDelay={0}
                placement="top"
              >
                {chip}
              </Tooltip>
            );
          }

          return (
            <Tooltip
              key={u.tempKey}
              content={`${u.filename} (${formatFileSize(u.sizeBytes)})`}
              delay={400}
              closeDelay={0}
              placement="top"
            >
              {chip}
            </Tooltip>
          );
        })}
      </div>
    ) : null;


  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      className="hidden"
      onChange={handleFileSelect}
    />
  );

  /** Collect workflows to send as context: canvas tabs (with content) + assigned (description only). */
  const getWorkflows = (): WorkflowInput[] | undefined => {
    const workflows: WorkflowInput[] = [];

    // Canvas tab workflows (with full content for editing context)
    const tabViews = editorContext?.editorStates.tabViews;
    if (tabViews) {
      for (const tab of tabViews) {
        if (tab.type === ViewModeEnum.Canvas && tab.openedWorkflow) {
          const wf = tab.openedWorkflow;
          workflows.push({
            id: `${wf.name}@${wf.version}`,
            name: wf.name,
            version: wf.version,
            content: wf.content,
          });
        }
      }
    }

    // Assigned workflows (lightweight — description only, no content)
    if (myWorkflows) {
      const canvasNames = new Set(workflows.map((w) => w.name));
      for (const wf of myWorkflows) {
        if (!canvasNames.has(wf.name)) {
          workflows.push({
            id: wf.id ?? `${wf.name}@${wf.version}`,
            name: wf.name,
            version: wf.version,
            description: wf.description,
          });
        }
      }
    }

    return workflows.length > 0 ? workflows : undefined;
  };

  // Track user scroll position so we don't fight manual scrolling
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        userScrolledUpRef.current = true;
      } else {
        const distanceFromBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom < 30) userScrolledUpRef.current = false;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: true });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (userScrolledUpRef.current) return;
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, todos]);

  // Continuous auto-scroll during streaming (content grows within the same message)
  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => {
      if (userScrolledUpRef.current) return;
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
    return () => clearInterval(id);
  }, [isLoading]);

  // ── Poll for async workflow task results ──────────────────────────────────
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTaskState[]>([]);
  const polledTaskIdsRef = useRef<Set<string>>(new Set());

  // Clear workflow tasks and uploads when a new chat session starts (messages cleared)
  useEffect(() => {
    if (messages.length === 0) {
      setWorkflowTasks([]);
      polledTaskIdsRef.current.clear();
      setUploads([]);
    }
  }, [messages.length]);

  // Seed workflow tasks from persisted workflowBuilds on session load
  useEffect(() => {
    if (workflowBuilds.length === 0) return;
    setWorkflowTasks((prev) => {
      const existingIds = new Set(prev.map((t) => t.taskId));
      const newTasks = workflowBuilds
        .filter((r) => r.workflowId && !existingIds.has(r.workflowId))
        .map((r) => ({
          taskId: r.workflowId!,
          workflowName: r.workflow?.name ?? "Workflow",
          startedAt: r.completedAt ? new Date(r.completedAt).getTime() : Date.now(),
          status: "completed" as const,
          result: { publishedWorkflowId: r.workflowId },
        }));
      return newTasks.length > 0 ? [...prev, ...newTasks] : prev;
    });
  }, [workflowBuilds]);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) return;

    for (const msg of messages) {
      if (msg._getType() === "human") continue;
      const content = typeof msg.content === "string" ? msg.content : "";
      if (!content.includes("taskId")) continue;

      let parsed: { taskId?: string; status?: string; workflowName?: string };
      try {
        parsed = JSON.parse(content);
      } catch {
        continue;
      }
      if (!parsed.taskId || parsed.status !== "running") continue;
      if (polledTaskIdsRef.current.has(parsed.taskId)) continue;

      polledTaskIdsRef.current.add(parsed.taskId);
      const taskId = parsed.taskId;
      const workflowName = parsed.workflowName ?? "Workflow";

      setWorkflowTasks((prev) => [
        ...prev,
        { taskId, workflowName, startedAt: Date.now(), status: "running" },
      ]);

      const poll = setInterval(async () => {
        try {
          const res = await fetch(
            `${backendUrl}/api/workflow/run/status?taskId=${taskId}`,
            { credentials: "include" },
          );
          if (!res.ok) return;
          const data = await res.json();
          // Derive latest progress from log
          const log = data.result?.log as { type: string; text?: string; tool?: string }[] | undefined;
          let latestProgress: string | undefined;
          if (log && log.length > 0) {
            const last = log[log.length - 1];
            latestProgress = last.type === "tool_use" ? `Using tool: ${last.tool}` : last.text;
          }

          setWorkflowTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId
                ? {
                    ...t,
                    status: data.status === "completed" || data.status === "failed" ? data.status : t.status,
                    result: data.result,
                    error: data.error,
                    latestProgress,
                  }
                : t,
            ),
          );

          if (data.status === "completed" || data.status === "failed") {
            clearInterval(poll);
            // Persist workflow builder result if it has a publishedWorkflowId
            if (data.status === "completed" && data.result) {
              const pwfId = extractPublishedWorkflowId(data.result);
              if (pwfId) {
                saveWorkflowBuild(pwfId);
              }
            }
          }
        } catch {
          // Network error — keep polling
        }
      }, 2000);

      setTimeout(
        () => {
          clearInterval(poll);
          setWorkflowTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId && t.status === "running"
                ? { ...t, status: "failed", error: "Timed out after 1 hour" }
                : t,
            ),
          );
        },
        60 * 60 * 1000,
      );
    }
  }, [messages]);

  const pendingSendRef = useRef<string | null>(null);

  const uploadsInProgress = uploads.some(
    (u) => u.status === "uploading" || u.status === "processing",
  );

  function doSend(value: string) {
    const readyUploadIds = uploads
      .filter((u) => u.status === "ready")
      .map((u) => u.id);
    setInputText("");
    setUploads([]);
    pendingSendRef.current = null;
    submit(value, getWorkflows(), readyUploadIds.length > 0 ? readyUploadIds : undefined);
  }

  function handleSend(text?: string) {
    const value = (text ?? inputText).trim();
    if (!value || isLoading) return;
    if (uploadsInProgress) {
      // Queue the send — it will fire once all uploads finish
      pendingSendRef.current = value;
      return;
    }
    doSend(value);
  }

  // Auto-send when uploads finish if a message was queued
  useEffect(() => {
    if (!uploadsInProgress && pendingSendRef.current) {
      doSend(pendingSendRef.current);
    }
  }, [uploadsInProgress]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);

  const [terminatingTaskIds, setTerminatingTaskIds] = useState<Set<string>>(new Set());

  const handleTerminateTask = async (taskId: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) return;
    setTerminatingTaskIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`${backendUrl}/api/workflow/run/terminate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        setWorkflowTasks((prev) =>
          prev.map((t) =>
            t.taskId === taskId
              ? { ...t, status: "failed", error: "Terminated by user" }
              : t,
          ),
        );
      }
    } catch {
      // silent
    } finally {
      setTerminatingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const isEmptyConversation = messages.length === 0 && !isLoading && !isLoadingSession;
  const activeProjectName = editorContext?.editorStates.project;
  const activeProject = projects?.find((p) => p.name === activeProjectName);

  const emptyState = activeProject ? (
    <ProjectScreen onSend={handleSend} project={activeProject} />
  ) : (
    <HomeScreen onSend={handleSend} projects={projects ?? []} />
  );

  // Build a map of tool_call_id → tool name from AIMessages so we can
  // identify which ToolMessages correspond to widget-rendering tools.
  const toolCallNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const msg of messages) {
      if (msg instanceof AIMessage && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.id) map.set(tc.id, tc.name);
        }
      }
    }
    return map;
  }, [messages]);

  const messageList = messages.map((msg, i) => {
    const isHuman = msg._getType() === "human";
    const content =
      typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content
              .filter(
                (b): b is { type: "text"; text: string } =>
                  typeof b === "object" &&
                  b !== null &&
                  "type" in b &&
                  b.type === "text",
              )
              .map((b) => b.text)
              .join("")
          : "";

    // ── Detect inline widgets ──────────────────────────────────────────
    const widgets: InlineWidgetData[] = [];

    // From AI tool_calls (the AI is requesting to render a widget)
    if (msg instanceof AIMessage && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const w = parseWidgetFromToolCall(
          tc.name,
          tc.args as Record<string, unknown>,
        );
        if (w) widgets.push(w);
      }
    }

    // From ToolMessage content (the tool result contains widget data)
    // Check both actual ToolMessage instances and any message whose content
    // looks like JSON (the stream may coerce tool messages as AIMessages).
    if (!isHuman) {
      const toolCallId = (msg as any).tool_call_id ?? "";
      const toolName = toolCallNameMap.get(toolCallId) ?? undefined;
      const w = parseWidgetFromToolMessage(toolCallId, content, toolName);
      if (w) widgets.push(w);
    }

    const spawned = msg.id ? getSubagentsByMessage(msg.id) : [];
    const hasWidgets = widgets.length > 0;

    // Filter out canvas widgets — they render as a sticky card above the input
    const nonCanvasWidgets = widgets.filter((w) => w.type !== "canvas");
    const hasNonCanvasWidgets = nonCanvasWidgets.length > 0;

    // Messages that are entirely widget data (JSON content): render only the widgets
    if (hasNonCanvasWidgets && content.trimStart().startsWith("{")) {
      return (
        <div key={msg.id ?? i} className="flex flex-col gap-2.5">
          {nonCanvasWidgets.map((w, wi) => (
            <InlineWidget key={wi} data={w} />
          ))}
        </div>
      );
    }

    // If the only widgets were canvas, and content is just JSON, skip rendering entirely
    if (
      widgets.length > 0 &&
      nonCanvasWidgets.length === 0 &&
      content.trimStart().startsWith("{")
    ) {
      return null;
    }

    // Collect tool call names from AI messages
    const toolCallNames: string[] = [];
    if (msg instanceof AIMessage && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.name) toolCallNames.push(tc.name);
      }
    }

    if (!content && spawned.length === 0 && !hasWidgets && toolCallNames.length === 0) return null;

    // Hide tool result messages — they are internal plumbing (raw JSON from tool
    // execution). The tool call *names* are shown as badges on the AI message
    // that invoked them, so no information is lost.
    if (!isHuman && (msg as any).tool_call_id) return null;

    // Hide AI messages that are purely JSON tool output with no widgets
    if (
      !isHuman &&
      !hasNonCanvasWidgets &&
      spawned.length === 0 &&
      toolCallNames.length === 0 &&
      content.trimStart().startsWith("{") &&
      content.trimStart().endsWith("}")
    ) {
      return null;
    }

    return (
      <div key={msg.id ?? i} className="flex flex-col gap-2.5">
        {isHuman ? (
          content && (
            <UserBubble
              text={content}
              attachmentCount={msg.additional_kwargs?.attachmentCount as number | undefined}
              uploadIds={msg.additional_kwargs?.uploadIds as string[] | undefined}
            />
          )
        ) : isPage ? (
          <AIResponseCard
            content={content}
            isStreaming={isLoading && i === messages.length - 1}
            widgets={widgets}
            toolCallNames={toolCallNames}
          />
        ) : (
          <ResponseCard
            content={content}
            isStreaming={isLoading && i === messages.length - 1}
            widgets={widgets}
            toolCallNames={toolCallNames}
          />
        )}
        {spawned.length > 0 && (
          <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-amber-400/30 pl-3 dark:border-amber-500/30">
            {spawned.map((sa) => (
              <SubagentCard key={sa.id} subagent={sa} />
            ))}
          </div>
        )}
      </div>
    );
  });

  // Find the latest workflow widget from messages after the last user message
  const latestWorkflow = useMemo(() => {
    let lastHumanIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]._getType() === "human") {
        lastHumanIdx = i;
        break;
      }
    }
    // Scan from last human message forward, keep the last canvas widget found
    let found: InlineWidgetData | null = null;
    for (let i = lastHumanIdx + 1; i < messages.length; i++) {
      const msg = messages[i];
      const content = typeof msg.content === "string" ? msg.content : "";
      if (!content) continue;
      const toolCallId = (msg as any).tool_call_id ?? "";
      const toolName = toolCallNameMap.get(toolCallId) ?? undefined;
      const w = parseWidgetFromToolMessage(toolCallId, content, toolName);
      if (w?.type === "canvas") found = w;
    }
    return found;
  }, [messages, toolCallNameMap]);

  const loadingIndicator = isLoading && (
    <div className="py-2">
      <div className="relative overflow-hidden rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 shadow-sm dark:border-amber-500/15 dark:from-amber-500/5 dark:via-orange-500/8 dark:to-amber-500/5">
        {/* Animated shimmer bar */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent dark:via-amber-400/10"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex items-center justify-center gap-2.5 py-2.5">
          {/* Pulsing dots */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <motion.p
            className="text-xs font-medium text-amber-600/80 dark:text-amber-300/70"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Palmos is thinking
          </motion.p>
        </div>
      </div>
    </div>
  );

  const sessionLoadingIndicator = isLoadingSession && (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
      <Spinner size="lg" />
      <motion.p
        className="text-sm font-medium text-amber-600/80 dark:text-amber-300/70"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading conversation...
      </motion.p>
    </div>
  );

  const errorBanner = !!error && (
    <div className="rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
      {error instanceof Error ? error.message : "An error occurred."}
    </div>
  );

  const quickPillButtons = (
    <>
      <Tooltip content="Help" delay={400} closeDelay={0}>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/50 bg-amber-50 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
          onClick={() => handleSend("What can you help me with?")}
        >
          <Icon name="help" variant="round" className="text-sm" />
        </button>
      </Tooltip>
      <Tooltip content="Examples" delay={400} closeDelay={0}>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/50 bg-amber-50 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
          onClick={() => handleSend("Show me examples of Palmos Apps")}
        >
          <Icon name="lightbulb" variant="round" className="text-sm" />
        </button>
      </Tooltip>
    </>
  );

  // ── Page layout ──────────────────────────────────────────────────────────

  if (isPage) {
    return (
      <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-gray-50 dark:bg-[#0d0d14]">
        {/* Spacer matching the chat nav-bar height */}
        <div
          className="flex h-[60px] shrink-0 items-end justify-end px-4 sm:px-8 md:h-[72px] md:px-16 lg:px-[max(4rem,calc(50%-36rem))]"
        >
          <div className="flex items-center gap-1.5 pb-2">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="border-default-200 text-default-600 hover:bg-default-100 flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              <Icon name="history" variant="round" className="text-sm" />
              History
              {sessions.length > 0 && (
                <span className="bg-default-200 ml-0.5 rounded-full px-1.5 text-[10px] font-medium dark:bg-white/10">
                  {sessions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsTasksOpen(true)}
              className="border-default-200 text-default-600 hover:bg-default-100 flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              <Icon name="task_alt" variant="round" className="text-sm" />
              Tasks
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:bg-amber-500/15"
            >
              <Icon name="add" variant="round" className="text-sm" />
              New Chat
            </button>
          </div>
        </div>

        {/* Session history overlay */}
        {isHistoryOpen && (
          <div className="absolute inset-0 z-30 flex">
            <div className="w-full max-w-sm">
              <SessionHistoryPanel
                sessions={sessions}
                activeSessionId={currentSessionIdRef.current}
                onSwitch={handleSwitchSession}
                onDelete={handleDeleteSession}
                onNewChat={() => {
                  handleNewChat();
                  setIsHistoryOpen(false);
                }}
                onClose={() => setIsHistoryOpen(false)}
              />
            </div>
            <div
              className="flex-1 bg-black/20 dark:bg-black/40"
              onClick={() => setIsHistoryOpen(false)}
            />
          </div>
        )}

        {/* Tasks panel overlay */}
        {isTasksOpen && (
          <div className="absolute inset-0 z-30 flex">
            <div className="w-full max-w-sm">
              <RunningTasksPanel onClose={() => setIsTasksOpen(false)} />
            </div>
            <div
              className="flex-1 bg-black/20 dark:bg-black/40"
              onClick={() => setIsTasksOpen(false)}
            />
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]"
        >
          {isLoadingSession ? (
            sessionLoadingIndicator
          ) : (
            <>
              {isEmptyConversation && emptyState}
              {messageList}
              {workflowTasks.map((task) => (
                <WorkflowTaskCard key={task.taskId} task={task} onTerminate={handleTerminateTask} isTerminating={terminatingTaskIds.has(task.taskId)} />
              ))}
              {activeInterrupt && (
                <InterruptCard
                  interrupt={activeInterrupt}
                  onReply={resume}
                  isLoading={isLoading}
                />
              )}
              {loadingIndicator}
              {errorBanner}
            </>
          )}
          <div className="h-2" />
        </div>

        {/* Todos */}
        {!isLoadingSession && todos.length > 0 && (
          <div className="border-t border-amber-200/40 px-4 py-2 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8">
            <TodoList todos={todos} />
          </div>
        )}

        {/* Workflow card */}
        {!isLoadingSession && latestWorkflow && (
          <div className="px-4 py-2 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]">
            <InlineWidget data={latestWorkflow} />
          </div>
        )}

        {/* Input */}
        <div
          className="relative flex flex-col gap-2 border-t border-amber-200/60 bg-white px-4 pt-3 pb-4 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8 dark:bg-white/3"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-amber-500 bg-amber-50/80 dark:border-amber-400 dark:bg-amber-900/30">
              <div className="flex flex-col items-center gap-1 text-amber-600 dark:text-amber-400">
                <Icon name="upload_file" variant="round" className="text-3xl" />
                <span className="text-sm font-medium">Drop files to attach</span>
              </div>
            </div>
          )}
          {attachmentChips}
          {hiddenFileInput}
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/60 bg-gray-50 px-3 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_14px_rgba(245,158,11,0.18)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_14px_rgba(251,191,36,0.22)]">
            <Tooltip content="Attach file" delay={400} closeDelay={0}>
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-amber-600 disabled:opacity-30 dark:text-white/40 dark:hover:text-amber-400"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                aria-label="Attach file"
              >
                <Icon name="attach_file" variant="round" className="text-base" />
              </button>
            </Tooltip>
            <textarea
              className="text-default-900 placeholder-default-500 max-h-40 flex-1 resize-none bg-transparent py-3 text-sm leading-5 outline-none dark:text-white dark:placeholder-white/45"
              style={{ height: "auto" }}
              placeholder="Ask Palmos AI anything..."
              value={inputText}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }
              }}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files);
                if (files.length > 0) {
                  e.preventDefault();
                  uploadFiles(files);
                }
              }}
              disabled={isLoading}
              autoFocus
              rows={1}
            />
            {inputText && !isLoading && (
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60"
                onClick={() => setInputText("")}
              >
                <Icon name="close" variant="round" className="text-base" />
              </button>
            )}
            {isLoading ? (
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 transition-all dark:bg-amber-400/20 dark:text-amber-300"
                onClick={stop}
              >
                <Icon name="stop" variant="round" className="text-base" />
              </button>
            ) : (
              <button
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white transition-all disabled:opacity-30 ${
                  inputText.trim() && !uploadsInProgress ? "animate-pulse-send-glow" : ""
                }`}
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
              >
                {uploadsInProgress && pendingSendRef.current ? (
                  <Spinner size="sm" classNames={{ wrapper: "h-4 w-4" }} />
                ) : (
                <Icon
                  name="arrow_upward"
                  variant="round"
                  className="text-base"
                />
                )}
              </button>
            )}
          </div>
          <div className={`flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] ${isPage ? "mt-2" : ""}`}>
            <ProjectPicker />
            <KnowledgeFiles />
            <div className="ml-auto flex gap-1.5">{quickPillButtons}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Panel layout ─────────────────────────────────────────────────────────

  return (
    <div className="relative grid h-full w-full min-w-0 grid-rows-[auto_1fr_max-content_max-content] overflow-hidden bg-gray-50 shadow-lg min-[768px]:rounded-xl dark:bg-[#111118] [&>*]:min-w-0 [&>*]:overflow-hidden">
      {/* Session history overlay (panel) */}
      {isHistoryOpen && (
        <SessionHistoryPanel
          sessions={sessions}
          activeSessionId={currentSessionIdRef.current}
          onSwitch={handleSwitchSession}
          onDelete={handleDeleteSession}
          onNewChat={() => {
            handleNewChat();
            setIsHistoryOpen(false);
          }}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Tasks panel overlay (panel) */}
      {isTasksOpen && (
        <div className="absolute inset-0 z-30">
          <RunningTasksPanel onClose={() => setIsTasksOpen(false)} />
        </div>
      )}

      {/* Header + WIP disclaimer */}
      <div>
        <div className="relative">
          <div className="flex items-center justify-center border-b border-amber-300/40 bg-white px-3 py-3 dark:border-white/8 dark:bg-white/3">
            <div className="absolute left-0 flex items-center gap-1 px-2">
              <Tooltip content="Chat History" delay={400} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={() => setIsHistoryOpen(true)}
                >
                  <div>
                    <Icon name="history" variant="round" />
                  </div>
                </Button>
              </Tooltip>
              <Tooltip content="New Chat" delay={400} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={handleNewChat}
                >
                  <div>
                    <Icon name="add" variant="round" />
                  </div>
                </Button>
              </Tooltip>
              <Tooltip content="Tasks" delay={400} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={() => setIsTasksOpen(true)}
                >
                  <div>
                    <Icon name="task_alt" variant="round" />
                  </div>
                </Button>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div>
                  <Icon name="bolt" className="text-lg" />
                </div>
              </motion.span>
              <motion.span
                className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-sm font-bold tracking-wide text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                PALMOS AI
              </motion.span>
            </div>
            <div className="absolute right-0 flex items-center gap-1 px-2">
              {isLoading && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-amber-600 hover:text-amber-500 dark:text-amber-400/80 dark:hover:text-amber-300"
                  onPress={() => stop()}
                >
                  <div>
                    <Icon name="stop" variant="round" />
                  </div>
                </Button>
              )}
              {onClose && (
                <Tooltip content="Close chat" delay={400} closeDelay={0}>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                    onPress={onClose}
                  >
                    <div>
                      <Icon name="close" variant="round" />
                    </div>
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-b border-amber-200/60 bg-amber-50/80 px-3 py-1.5 dark:border-amber-500/20 dark:bg-amber-500/8">
          <Icon
            name="construction"
            variant="round"
            className="text-xs text-amber-600 dark:text-amber-400"
          />
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Work in progress</span> — some
            features may not fully function yet.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex min-w-0 flex-col gap-3 overflow-y-auto p-3"
      >
        {isLoadingSession ? (
          sessionLoadingIndicator
        ) : (
          <>
            {isEmptyConversation && emptyState}
            {messageList}
            {workflowTasks.map((task) => (
              <WorkflowTaskCard key={task.taskId} task={task} />
            ))}
            {activeInterrupt && (
              <InterruptCard
                interrupt={activeInterrupt}
                onReply={resume}
                isLoading={isLoading}
              />
            )}
            {loadingIndicator}
            {errorBanner}
          </>
        )}
      </div>

      {/* Todos */}
      {!isLoadingSession && todos.length > 0 && <TodoList todos={todos} />}

      {/* Workflow card */}
      {!isLoadingSession && latestWorkflow && (
        <div className="px-3 py-2">
          <InlineWidget data={latestWorkflow} />
        </div>
      )}

      {/* Input */}
      <div
        className="relative flex flex-col gap-2 border-t border-amber-200/60 bg-white px-3 pt-3 pb-2 dark:border-white/8 dark:bg-white/3"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-amber-500 bg-amber-50/80 dark:border-amber-400 dark:bg-amber-900/30">
            <div className="flex flex-col items-center gap-1 text-amber-600 dark:text-amber-400">
              <Icon name="upload_file" variant="round" className="text-2xl" />
              <span className="text-xs font-medium">Drop files to attach</span>
            </div>
          </div>
        )}
        {attachmentChips}
        {hiddenFileInput}
        <div className="flex items-end gap-2 rounded-lg border border-amber-300/60 bg-gray-50 px-2 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_12px_rgba(245,158,11,0.15)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_12px_rgba(251,191,36,0.2)]">
          <Tooltip content="Attach file" delay={400} closeDelay={0}>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-amber-600 disabled:opacity-30 dark:text-white/40 dark:hover:text-amber-400"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              aria-label="Attach file"
            >
              <Icon name="attach_file" variant="round" className="text-base" />
            </button>
          </Tooltip>
          <textarea
            className="text-default-900 placeholder-default-500 max-h-40 flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 outline-none dark:text-white dark:placeholder-white/45"
            style={{ height: "auto" }}
            placeholder="Ask Palmos AI..."
            value={inputText}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }
            }}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length > 0) {
                e.preventDefault();
                uploadFiles(files);
              }
            }}
            disabled={isLoading}
            rows={1}
          />
          {inputText && !isLoading && (
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60"
              onClick={() => setInputText("")}
            >
              <Icon name="close" variant="round" className="text-base" />
            </button>
          )}
          <button
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white transition-all disabled:opacity-30 ${
              inputText.trim() && !isLoading && !uploadsInProgress ? "animate-pulse-send-glow" : ""
            }`}
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            {uploadsInProgress && pendingSendRef.current ? (
              <Spinner size="sm" classNames={{ wrapper: "h-4 w-4" }} />
            ) : (
              <Icon name="arrow_upward" variant="round" className="text-base" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
          <ProjectPicker />
          <KnowledgeFiles />
          <div className="ml-auto flex gap-1.5">{quickPillButtons}</div>
        </div>
      </div>
    </div>
  );
}
