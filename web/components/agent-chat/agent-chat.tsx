"use client";

import { SubagentCard } from "@/components/agent-chat/cards/subagent-card";
import { WorkflowTaskCard } from "@/components/agent-chat/cards/workflow-task-card";
import type { WorkflowTaskState } from "@/components/agent-chat/helpers";
import ChatHistoryPanel from "@/components/interface/panels/chat-history-panel";
import HomeScreen from "@/components/agent-chat/initial-chat-screens/home-screen";
import ProjectScreen from "@/components/agent-chat/initial-chat-screens/project-screen";
import {
  AgentChatPageLayout,
  AgentChatPanelLayout,
} from "@/components/agent-chat/layouts/agent-chat-layouts";
import AgentChatPaywall from "@/components/agent-chat/screens/agent-chat-paywall";
import InlineWidget, {
  type InlineWidgetData,
  parseWidgetFromToolCall,
  parseWidgetFromToolMessage,
} from "@/components/agent-chat/widgets/inline-widget";
import { type ChatUpload } from "@/components/agent-chat/widgets/input/chat-input-bar";
import {
  AIResponseCard,
  ResponseCard,
  UserBubble,
} from "@/components/agent-chat/widgets/message/message-bubbles";
import QuickPillButtons from "@/components/agent-chat/widgets/quick-pill-buttons";
import ShareChatModal from "@/components/modals/share-chat-modal";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useAgentAccess } from "@/lib/hooks/use-agent-access";
import type { WorkflowInput } from "@/lib/types";
import { AIMessage } from "@langchain/core/messages";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchWorkflowRunStatus } from "@/lib/workflow/fetch-workflow-run-status";
import RunningTasksPanel from "./panels/running-tasks-panel";

/** Walk an object recursively to find a publishedWorkflowId */
function extractPublishedWorkflowId(obj: unknown): string | null {
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
    resume,
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
        result?: unknown;
        error?: string | null;
      }) => {
        const log = (data.result as { log?: unknown })?.log as
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
        const result = await fetchWorkflowRunStatus(backendUrl, taskId);
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
        if (result.data.status !== "completed" && result.data.status !== "failed") {
          startPoll();
        }
      })();

      function startPoll() {
        const poll = setInterval(async () => {
          const result = await fetchWorkflowRunStatus(backendUrl, taskId);
          if (!result.ok) return;
          applyStatus(result.data);
          if (result.data.status === "completed" || result.data.status === "failed") {
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

  const emptyState = activeProject ? (
    <ProjectScreen onSend={handleSend} project={activeProject} />
  ) : (
    <HomeScreen onSend={handleSend} projects={projects ?? []} />
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

    const widgets: InlineWidgetData[] = [];

    if (msg instanceof AIMessage && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const w = parseWidgetFromToolCall(
          tc.name,
          tc.args as Record<string, unknown>,
        );
        if (w) widgets.push(w);
      }
    }

    if (!isHuman) {
      const toolCallId = (msg as any).tool_call_id ?? "";
      const toolName = toolCallNameMap.get(toolCallId) ?? undefined;
      const w = parseWidgetFromToolMessage(toolCallId, content, toolName);
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

    if (hasNonCanvasWidgets && content.trimStart().startsWith("{")) {
      return (
        <div key={msg.id ?? i} className="flex flex-col gap-2.5">
          {nonCanvasWidgets.map((w, wi) => (
            <InlineWidget key={wi} data={w} />
          ))}
        </div>
      );
    }

    if (
      widgets.length > 0 &&
      nonCanvasWidgets.length === 0 &&
      content.trimStart().startsWith("{")
    ) {
      return null;
    }

    const toolCallNames: string[] = [];
    if (msg instanceof AIMessage && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.name) toolCallNames.push(tc.name);
      }
    }

    if (
      !content &&
      spawned.length === 0 &&
      !widgets.length &&
      toolCallNames.length === 0 &&
      !workflowTask
    )
      return null;
    if (!isHuman && (msg as any).tool_call_id) return null;
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
              attachmentCount={
                msg.additional_kwargs?.attachmentCount as number | undefined
              }
              uploadIds={
                msg.additional_kwargs?.uploadIds as string[] | undefined
              }
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
        {workflowTask && (
          <WorkflowTaskCard
            task={workflowTask}
            onTerminate={handleTerminateTask}
            isTerminating={terminatingTaskIds?.has(workflowTask.taskId)}
          />
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
    <ChatHistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
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
    latestWorkflow,
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
  if (!isLoadingAccess && !agentChatAllowed) {
    return <AgentChatPaywall />;
  }

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
  };

  if (isPage) {
    return <AgentChatPageLayout {...layoutProps} />;
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
