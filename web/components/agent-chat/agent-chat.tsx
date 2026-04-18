"use client";

import {
  parseBlockFromToolCall,
  parseBlockFromToolMessage,
} from "@/components/agent-chat/chat-blocks/utils";
import HomeScreen from "@/components/agent-chat/chat-screens/home-screen";
import { type ChatUpload } from "@/components/agent-chat/input/chat-input-bar";
import QuickPillButtons from "@/components/agent-chat/input/quick-pill-buttons";
import { AgentChatLayout } from "@/components/agent-chat/layouts/agent-chat-layouts";
import ChatHistoryPanel from "@/components/interface/panels/chat-history-panel";
import ShareChatModal from "@/components/modals/share-chat-modal";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useAgentAccess } from "@/lib/hooks/use-agent-access";
import type {
  ChatBlockData,
  WorkflowInput,
  WorkflowTaskState,
} from "@/lib/types";
import { fetchWorkflowRunStatus } from "@/lib/workflow/fetch-workflow-run-status";
import { AIMessage } from "@langchain/core/messages";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AgentChatPanelLayout } from "./layouts/agent-chat-panel-layout";
import RunningTasksPanel from "./panels/running-tasks-panel";

/** Walk an object recursively to find a publishedWorkflowId */
function extractPublishedWorkflowId(obj: any): string | null {
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      if (typeof parsed.publishedWorkflowId === "string")
        return parsed.publishedWorkflowId;
    } catch {
      const m = obj.match(/"publishedWorkflowId"\s*:\s*"([^"]+)"/);
      if (m) return m[1];
    }
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const rec = obj as Record<string, unknown>;
    if (typeof rec.publishedWorkflowId === "string")
      return rec.publishedWorkflowId;
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

export default function AgentChat({
  variant = "panel",
  onClose,
}: {
  /** "panel" = narrow side-panel chrome; "page" = full-page layout */
  variant?: "panel" | "page";
  /** Callback for the close button (panel variant only) */
  onClose?: () => void;
}) {
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
    activeQAForm,
    resume,
    resumeQAForm,
  } = useChatContext();

  const { allowed: agentChatAllowed, isLoading: isLoadingAccess } =
    useAgentAccess();

  const editorContext = useContext(EditorContext);
  const projects = editorContext?.editorStates.projectsInfo;
  const activeProjectName = editorContext?.editorStates.project;
  const activeProject = projects?.find((p) => p.name === activeProjectName);
  const { workflows: myWorkflows } = useMarketplaceWorkflows(
    "My Workflows",
    activeProject?.id,
  );

  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const isPage = variant === "page";

  // ── File uploads ────────────────────────────────────────────────────────
  const [uploads, setUploads] = useState<ChatUpload[]>([]);

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
    await Promise.all(
      selected.map((file) => uploadSingleFile(file, backendUrl)),
    );
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
        // Best-effort cleanup
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

  /** Collect workflows to send as context */
  const getWorkflows = (): WorkflowInput[] | undefined => {
    const workflows: WorkflowInput[] = [];
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

  // Track user scroll position
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

  // Continuous auto-scroll during streaming
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

  // Clear workflow tasks and uploads when a new chat session starts
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
      const existingPublishedIds = new Set(
        prev
          .map((t) => extractPublishedWorkflowId(t.result))
          .filter((id): id is string => !!id),
      );
      const newTasks = workflowBuilds
        .filter(
          (r) =>
            r.workflowId &&
            !existingIds.has(r.workflowId) &&
            !existingPublishedIds.has(r.workflowId),
        )
        .map((r) => ({
          taskId: r.workflowId!,
          // Preserve the originating build_workflow tool-call taskId so the
          // card can be rendered inline under its AI message on reload.
          originalTaskId: r.taskId ?? undefined,
          workflowName: r.workflow?.name ?? "Workflow",
          startedAt: r.completedAt
            ? new Date(r.completedAt).getTime()
            : Date.now(),
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

      // Seed as "loading" — we'll check the DB before deciding whether this
      // task is actually still running.
      setWorkflowTasks((prev) => [
        ...prev,
        {
          taskId,
          originalTaskId: taskId,
          workflowName,
          startedAt: Date.now(),
          status: "loading",
        },
      ]);

      const applyStatus = (data: {
        status?: string;
        result?: any;
        error?: string | null;
      }) => {
        const log = (data.result as { log?: any })?.log as
          | { type: string; text?: string; tool?: string }[]
          | undefined;
        let latestProgress: string | undefined;
        if (log && log.length > 0) {
          const last = log[log.length - 1];
          latestProgress =
            last.type === "tool_use" ? `Using tool: ${last.tool}` : last.text;
        }

        setWorkflowTasks((prev) =>
          prev.map((t) =>
            t.taskId === taskId
              ? {
                  ...t,
                  status:
                    data.status === "completed" ||
                    data.status === "failed" ||
                    data.status === "running"
                      ? (data.status as "completed" | "failed" | "running")
                      : t.status,
                  result: data.result,
                  error: data.error ?? undefined,
                  latestProgress,
                }
              : t,
          ),
        );

        if (data.status === "completed" && data.result) {
          const pwfId = extractPublishedWorkflowId(data.result);
          if (pwfId) {
            setWorkflowTasks((prev) =>
              prev.map((t) =>
                t.taskId === taskId ? { ...t, taskId: pwfId } : t,
              ),
            );
            saveWorkflowBuild(pwfId);
            // Resolve the real workflow name (the tool reports "Workflow
            // Builder" — we want the built workflow's actual name).
            fetch(`${backendUrl}/api/workflow/get?id=${pwfId}`, {
              credentials: "include",
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((wf: { name?: string } | null) => {
                if (!wf?.name) return;
                setWorkflowTasks((prev) =>
                  prev.map((t) =>
                    t.taskId === pwfId ? { ...t, workflowName: wf.name! } : t,
                  ),
                );
              })
              .catch(() => {});
          }
        }
      };

      // One-shot DB check on load: decide between final state vs. still running.
      (async () => {
        const result = await fetchWorkflowRunStatus(taskId);
        if (!result.ok) {
          // Can't determine — fall back to running so we start polling.
          setWorkflowTasks((prev) =>
            prev.map((t) =>
              t.taskId === taskId ? { ...t, status: "running" } : t,
            ),
          );
          startPoll();
          return;
        }
        applyStatus(result.data);
        if (
          result.data.status !== "completed" &&
          result.data.status !== "failed"
        ) {
          startPoll();
        }
      })();

      function startPoll() {
        const poll = setInterval(async () => {
          const result = await fetchWorkflowRunStatus(taskId);
          if (!result.ok) return;
          applyStatus(result.data);
          if (
            result.data.status === "completed" ||
            result.data.status === "failed"
          ) {
            clearInterval(poll);
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
    submit(
      value,
      getWorkflows(),
      readyUploadIds.length > 0 ? readyUploadIds : undefined,
      activeProject?.id,
    );
  }

  function handleSend(text?: string) {
    const value = (text ?? inputText).trim();
    if (!value || isLoading) return;
    if (uploadsInProgress) {
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
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);

  const [terminatingTaskIds, setTerminatingTaskIds] = useState<Set<string>>(
    new Set(),
  );

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

  const isEmptyConversation =
    messages.length === 0 && !isLoading && !isLoadingSession;

  const [isOnboardingAnalyzing, setIsOnboardingAnalyzing] = useState(false);

  const handleOnboardingComplete = useCallback(
    (analysis: import("@/lib/types").ProjectAnalysisInfo) => {
      setIsOnboardingAnalyzing(false);
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        projectsInfo: prev.projectsInfo?.map((p) =>
          p.id === activeProject?.id
            ? { ...p, projectAnalysis: analysis }
            : p,
        ),
      }));
    },
    [editorContext, activeProject?.id],
  );

  const emptyState = (
    <HomeScreen
      onSend={handleSend}
      projects={projects ?? []}
      activeProject={activeProject}
      onOnboardingComplete={handleOnboardingComplete}
      onAnalyzingChange={setIsOnboardingAnalyzing}
    />
  );

  // Build a map of tool_call_id -> tool name from AIMessages
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

  // Attach each workflow task to its originating AI message. Walks the
  // messages array looking for any message whose content contains the task's
  // original ID (covers both ToolMessage results and any message that embeds
  // the JSON), then walks backwards to the nearest non-human / AI message to
  // find the "owner" message under which to render the task card.
  const aiMessageWorkflowTask = useMemo(() => {
    const byMsg = new WeakMap<object, WorkflowTaskState>();
    const attached = new Set<string>();

    for (const task of workflowTasks) {
      const origId = task.originalTaskId;
      if (!origId || attached.has(origId)) continue;

      // Find any message whose content mentions this task ID.
      let matchIdx = -1;
      for (let k = 0; k < messages.length; k++) {
        const m = messages[k];
        const c = typeof m.content === "string" ? m.content : "";
        if (c.includes(origId)) {
          matchIdx = k;
          break;
        }
      }
      if (matchIdx < 0) continue;

      // Walk backwards to find the AI message that owns this tool call.
      let ownerIdx = matchIdx;
      while (
        ownerIdx >= 0 &&
        (messages[ownerIdx]._getType() === "human" ||
          (messages[ownerIdx] as any).tool_call_id)
      ) {
        ownerIdx--;
      }
      if (ownerIdx < 0) continue; // no preceding AI message — leave for bottom list

      byMsg.set(messages[ownerIdx], task);
      attached.add(origId);
    }
    return byMsg;
  }, [messages, workflowTasks]);

  const inlinedTaskIds = new Set<string>();

  const messageList: ChatBlockData[] = [];
  const messageSourceMap = new Map<number, typeof messages[number]>();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
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

    const widgets: ChatBlockData[] = [];

    if (msg instanceof AIMessage && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const w = parseBlockFromToolCall(
          tc.name,
          tc.args as Record<string, unknown>,
        );
        if (w) widgets.push(w);
      }
    }

    if (!isHuman) {
      const toolCallId = (msg as any).tool_call_id ?? "";
      const toolName = toolCallNameMap.get(toolCallId) ?? undefined;
      const w = parseBlockFromToolMessage(toolCallId, content, toolName);
      if (w) widgets.push(w);
    }

    // An AI message that issued a build_workflow / run_workflow tool call
    // owns the resulting workflow task. Pair the two so the task card renders
    // alongside the message content rather than trailing at the bottom.
    const workflowTask = aiMessageWorkflowTask.get(msg);
    if (workflowTask) inlinedTaskIds.add(workflowTask.taskId);

    const spawned = msg.id ? getSubagentsByMessage(msg.id) : [];
    const nonCanvasWidgets = widgets.filter((w) => w.type !== "canvas");
    const hasNonCanvasWidgets = nonCanvasWidgets.length > 0;

    // AI message whose content is raw JSON but produced widget(s) — show widgets only
    if (hasNonCanvasWidgets && content.trimStart().startsWith("{")) {
      for (const w of nonCanvasWidgets) messageList.push(w);
      continue;
    }

    // Canvas-only widget with JSON content — skip entirely
    if (
      widgets.length > 0 &&
      nonCanvasWidgets.length === 0 &&
      content.trimStart().startsWith("{")
    ) {
      continue;
    }

    const toolCallNames: string[] = [];
    if (msg instanceof AIMessage && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.name) toolCallNames.push(tc.name);
      }
    }

    if (toolCallNames.length > 0) {
      widgets.push({ type: "tool-call", toolCallNames });
    }

    // Nothing to show
    if (!content && spawned.length === 0 && !widgets.length && !workflowTask)
      continue;
    // Skip ToolMessages (result is already parsed into widgets above)
    if (!isHuman && (msg as any).tool_call_id) continue;
    // AI message with only raw JSON content and no widgets/subagents
    if (
      !isHuman &&
      !hasNonCanvasWidgets &&
      spawned.length === 0 &&
      toolCallNames.length === 0 &&
      content.trimStart().startsWith("{") &&
      content.trimStart().endsWith("}")
    ) {
      continue;
    }

    if (isHuman) {
      if (content) {
        messageList.push({
          type: "user-message",
          text: content,
          attachmentCount: msg.additional_kwargs?.attachmentCount as
            | number
            | undefined,
          uploadIds: msg.additional_kwargs?.uploadIds as string[] | undefined,
        });
      }
    } else {
      messageList.push({
        type: "ai-message",
        variant: isPage ? "page" : "panel",
        content,
        isStreaming: isLoading && i === messages.length - 1,
        widgets,
        subagents: spawned,
        workflowTask,
        onTerminateTask: handleTerminateTask,
        isTerminatingTask: workflowTask
          ? terminatingTaskIds?.has(workflowTask.taskId)
          : undefined,
        chosenSuggestion: msg.additional_kwargs?.chosenSuggestion as
          | string
          | undefined,
      });
      messageSourceMap.set(messageList.length - 1, msg);
    }
  }

  // Append active interrupt / QA form blocks so they render at the bottom
  if (activeInterrupt) {
    messageList.push({
      type: "interrupt",
      interrupt: activeInterrupt,
      onReply: resume,
      isLoading,
    });
  }
  if (activeQAForm) {
    messageList.push({
      type: "qa-form",
      form: activeQAForm,
      onSubmit: resumeQAForm,
      isLoading,
    });
  }

  // Attach suggestion click handler to the last AI message only
  if (!isLoading && !activeInterrupt && !activeQAForm) {
    for (let i = messageList.length - 1; i >= 0; i--) {
      if (messageList[i].type === "ai-message") {
        const sourceMsg = messageSourceMap.get(i);
        (messageList[i] as any).onSuggestionClick = (text: string) => {
          // Persist chosen suggestion into the AI message's additional_kwargs
          if (sourceMsg) {
            sourceMsg.additional_kwargs = {
              ...sourceMsg.additional_kwargs,
              chosenSuggestion: text,
            };
          }
          handleSend(text);
        };
        break;
      }
    }
  }

  const quickPillButtons = <QuickPillButtons onSend={handleSend} />;

  // ── Shared overlays ─────────────────────────────────────────────────────
  const shareModal = (
    <ShareChatModal
      sessionId={shareSessionId ?? currentSessionIdRef.current}
      isOpen={!!shareSessionId}
      onClose={() => setShareSessionId(null)}
    />
  );

  const historyOverlay = (
    <ChatHistoryPanel
      isOpen={isHistoryOpen}
      onClose={() => setIsHistoryOpen(false)}
    />
  );

  const tasksOverlay = isTasksOpen && (
    <RunningTasksPanel isPage={isPage} onClose={() => setIsTasksOpen(false)} />
  );

  const messageAreaProps = {
    variant,
    isLoadingSession,
    isEmptyConversation,
    emptyState,
    messageList,
    workflowTasks: workflowTasks.filter((t) => !inlinedTaskIds.has(t.taskId)),
    onTerminateTask: handleTerminateTask,
    terminatingTaskIds,
    activeInterrupt,
    resume,
    isLoading,
    error,
    todos,
    scrollContainerRef,
  } as const;

  const inputBarProps = {
    variant,
    inputText,
    setInputText,
    isLoading,
    uploads,
    uploadsInProgress,
    pendingSend: !!pendingSendRef.current,
    onSend: () => handleSend(),
    onStop: stop,
    onUploadFiles: uploadFiles,
    onRemoveUpload: handleRemoveUpload,
    onIndexUpload: handleIndexUpload,
  } as const;

  // ── Gate: paywall for users without agent chat access ────────────────────
  // Access (including any invite-code bypass) is decided by the backend via
  // useAgentAccess — agentChatAllowed already reflects an accepted code.
  // if (!isLoadingAccess && !agentChatAllowed) {
  //   return <AgentChatPaywall />;
  // }

  // ── Layout ────────────────────────────────────────────────────────────────

  const layoutProps = {
    messageAreaProps,
    inputBarProps,
    quickPillButtons,
    shareModal,
    historyOverlay,
    tasksOverlay,
    sessionCount: sessions.length,
    canShare: !!currentSessionIdRef.current,
    onOpenHistory: () => setIsHistoryOpen(true),
    onOpenTasks: () => setIsTasksOpen(true),
    onNewChat: handleNewChat,
    onShare: () => setShareSessionId(currentSessionIdRef.current),
    hideInput: isEmptyConversation && isOnboardingAnalyzing,
  };

  if (isPage) {
    return <AgentChatLayout {...layoutProps} />;
  }

  return (
    <AgentChatPanelLayout
      {...layoutProps}
      isLoading={isLoading}
      onStop={() => stop()}
      onClose={onClose}
    />
  );
}
