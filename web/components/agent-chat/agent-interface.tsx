"use client";

import type { WorkflowTaskState } from "@/components/agent-chat/helpers";
import HomeScreen from "@/components/agent-chat/initial-chat-screens/home-screen";
import ProjectScreen from "@/components/agent-chat/initial-chat-screens/project-screen";
import { AIResponseCard, ResponseCard, UserBubble } from "@/components/agent-chat/message-bubbles";
import { SessionHistoryPanel } from "@/components/agent-chat/session-history";
import { SubagentCard } from "@/components/agent-chat/subagent-card";
import RunningTasksPanel from "@/components/agent-chat/running-tasks-panel";
import ShareChatModal from "@/components/agent-chat/share-chat-modal";
import InlineWidget, {
  type InlineWidgetData,
  parseWidgetFromToolCall,
  parseWidgetFromToolMessage,
} from "@/components/agent-chat/inline-widget";
import ChatInputBar, { type ChatUpload } from "@/components/agent-chat/chat-input-bar";
import ChatMessageArea from "@/components/agent-chat/chat-message-area";
import Icon from "@/components/misc/icon";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import type { WorkflowInput } from "@/lib/types";
import { Button, Tooltip } from "@heroui/react";
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
  const activeProjectName = editorContext?.editorStates.project;
  const activeProject = projects?.find((p) => p.name === activeProjectName);
  const { workflows: myWorkflows } = useMarketplaceWorkflows("My Workflows", activeProject?.id);

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
    await Promise.all(selected.map((file) => uploadSingleFile(file, backendUrl)));
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
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
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
            if (data.status === "completed" && data.result) {
              const pwfId = extractPublishedWorkflowId(data.result);
              if (pwfId) saveWorkflowBuild(pwfId);
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
    submit(value, getWorkflows(), readyUploadIds.length > 0 ? readyUploadIds : undefined, activeProject?.id);
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
        const w = parseWidgetFromToolCall(tc.name, tc.args as Record<string, unknown>);
        if (w) widgets.push(w);
      }
    }

    if (!isHuman) {
      const toolCallId = (msg as any).tool_call_id ?? "";
      const toolName = toolCallNameMap.get(toolCallId) ?? undefined;
      const w = parseWidgetFromToolMessage(toolCallId, content, toolName);
      if (w) widgets.push(w);
    }

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

    if (widgets.length > 0 && nonCanvasWidgets.length === 0 && content.trimStart().startsWith("{")) {
      return null;
    }

    const toolCallNames: string[] = [];
    if (msg instanceof AIMessage && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.name) toolCallNames.push(tc.name);
      }
    }

    if (!content && spawned.length === 0 && !widgets.length && toolCallNames.length === 0) return null;
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

  const quickPillButtons = (
    <>
      <button
        className="flex h-7 items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
        onClick={() => handleSend("What can you help me with?")}
      >
        <Icon name="help" variant="round" className="text-sm" />
        <span className="hidden text-[11px] font-medium sm:inline">Help</span>
      </button>
      <button
        className="flex h-7 items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
        onClick={() => handleSend("Show me examples of Palmos Apps")}
      >
        <Icon name="lightbulb" variant="round" className="text-sm" />
        <span className="hidden text-[11px] font-medium sm:inline">Examples</span>
      </button>
    </>
  );

  // ── Shared overlays ─────────────────────────────────────────────────────
  const shareModal = (
    <ShareChatModal
      sessionId={shareSessionId ?? currentSessionIdRef.current}
      isOpen={!!shareSessionId}
      onClose={() => setShareSessionId(null)}
    />
  );

  const historyOverlay = isHistoryOpen && (
    isPage ? (
      <div className="absolute inset-0 z-30 flex">
        <div className="w-full max-w-sm">
          <SessionHistoryPanel
            sessions={sessions}
            activeSessionId={currentSessionIdRef.current}
            onSwitch={handleSwitchSession}
            onDelete={handleDeleteSession}
            onNewChat={() => { handleNewChat(); setIsHistoryOpen(false); }}
            onClose={() => setIsHistoryOpen(false)}
            onShare={(id) => setShareSessionId(id)}
          />
        </div>
        <div
          className="flex-1 bg-black/20 dark:bg-black/40"
          onClick={() => setIsHistoryOpen(false)}
        />
      </div>
    ) : (
      <SessionHistoryPanel
        sessions={sessions}
        activeSessionId={currentSessionIdRef.current}
        onSwitch={handleSwitchSession}
        onDelete={handleDeleteSession}
        onNewChat={() => { handleNewChat(); setIsHistoryOpen(false); }}
        onClose={() => setIsHistoryOpen(false)}
      />
    )
  );

  const tasksOverlay = isTasksOpen && (
    isPage ? (
      <div className="absolute inset-0 z-30 flex">
        <div className="w-full max-w-sm">
          <RunningTasksPanel onClose={() => setIsTasksOpen(false)} />
        </div>
        <div
          className="flex-1 bg-black/20 dark:bg-black/40"
          onClick={() => setIsTasksOpen(false)}
        />
      </div>
    ) : (
      <div className="absolute inset-0 z-30">
        <RunningTasksPanel onClose={() => setIsTasksOpen(false)} />
      </div>
    )
  );

  const messageAreaProps = {
    variant,
    isLoadingSession,
    isEmptyConversation,
    emptyState,
    messageList,
    workflowTasks,
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

  // ── Page layout ──────────────────────────────────────────────────────────

  if (isPage) {
    return (
      <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-gray-50 dark:bg-[#0d0d14]">
        {/* Top bar */}
        <div className="flex h-[60px] shrink-0 items-end justify-end px-4 sm:px-8 md:h-[72px] md:px-16 lg:px-[max(4rem,calc(50%-36rem))]">
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
            <button
              onClick={() => setShareSessionId(currentSessionIdRef.current)}
              disabled={!currentSessionIdRef.current}
              className="border-default-200 text-default-600 hover:bg-default-100 flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs transition-colors disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              <Icon name="share" variant="round" className="text-sm" />
              Share
            </button>
          </div>
        </div>

        {shareModal}
        {historyOverlay}
        {tasksOverlay}

        <ChatMessageArea {...messageAreaProps} />
        <ChatInputBar {...inputBarProps} footerExtra={quickPillButtons} />
      </div>
    );
  }

  // ── Panel layout ─────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-gray-50 shadow-lg min-[768px]:rounded-xl dark:bg-[#111118] [&>*]:min-w-0 [&>*]:overflow-hidden">
      {historyOverlay}
      {tasksOverlay}
      {shareModal}

      {/* Header */}
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
      </div>

      <ChatMessageArea {...messageAreaProps} />

      <ChatInputBar
        {...inputBarProps}
        footerExtra={
          <>
            <Tooltip content="Share chat" delay={400} closeDelay={0}>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                isDisabled={!currentSessionIdRef.current}
                onPress={() => setShareSessionId(currentSessionIdRef.current)}
              >
                <div>
                  <Icon name="share" variant="round" />
                </div>
              </Button>
            </Tooltip>
            {quickPillButtons}
          </>
        }
      />
    </div>
  );
}
