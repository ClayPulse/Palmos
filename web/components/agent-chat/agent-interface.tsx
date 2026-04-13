"use client";

import { MyAutomationsCarousel, MyWorkflowsCarousel } from "@/components/agent-chat/carousels";
import type { WorkflowTaskState } from "@/components/agent-chat/helpers";
import { AIResponseCard, ResponseCard, UserBubble } from "@/components/agent-chat/message-bubbles";
import { SessionHistoryPanel } from "@/components/agent-chat/session-history";
import { STARTER_PROMPTS, StarterPromptButton } from "@/components/agent-chat/starter-prompts";
import { SubagentCard } from "@/components/agent-chat/subagent-card";
import { TodoList } from "@/components/agent-chat/todo-list";
import RunningTasksPanel from "@/components/agent-chat/running-tasks-panel";
import { WorkflowTaskCard } from "@/components/agent-chat/workflow-task-card";
import InlineWidget, {
  type InlineWidgetData,
  parseWidgetFromToolCall,
  parseWidgetFromToolMessage,
} from "@/components/agent-chat/inline-widget";
import Icon from "@/components/misc/icon";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useAutomations } from "@/lib/hooks/use-automations";
import type { WorkflowInput } from "@/lib/types";
import { Button, Spinner, Tooltip } from "@heroui/react";
import { AIMessage } from "@langchain/core/messages";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { motion } from "framer-motion";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

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
  } = useChatContext();

  const editorContext = useContext(EditorContext);
  const { workflows: myWorkflows, isLoading: isLoadingMyWorkflows } =
    useMarketplaceWorkflows("My Workflows");
  const { automations, isLoading: isLoadingAutomations } = useAutomations();

  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const isPage = variant === "page";

  // ── File uploads ────────────────────────────────────────────────────────
  interface ChatUpload {
    id: string; // server-assigned ID once uploaded; temp key while pending
    filename: string;
    sizeBytes: number;
    status: "uploading" | "ready" | "error";
    error?: string;
    tempKey: string; // stable local key for React + in-flight tracking
  }
  const [uploads, setUploads] = useState<ChatUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    e.target.value = ""; // reset so selecting the same file again triggers change

    if (!backendUrl) {
      console.error("NEXT_PUBLIC_BACKEND_URL is not set");
      return;
    }

    for (const file of selected) {
      const tempKey = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((prev) => [
        ...prev,
        {
          id: tempKey,
          filename: file.name,
          sizeBytes: file.size,
          status: "uploading",
          tempKey,
        },
      ]);

      try {
        const form = new FormData();
        form.append("file", file);
        // Only include sessionId if the session is likely persisted on
        // the backend — otherwise the upload endpoint returns 404.
        if (messages.length > 0 && currentSessionIdRef.current) {
          form.append("sessionId", currentSessionIdRef.current);
        }

        const res = await fetch(`${backendUrl}/api/chat/upload`, {
          method: "POST",
          credentials: "include",
          body: form,
        });

        if (!res.ok) {
          let msg = `Upload failed (${res.status})`;
          try {
            const data = await res.json();
            if (data?.error) msg = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }

        const data = (await res.json()) as { id: string };
        setUploads((prev) =>
          prev.map((u) =>
            u.tempKey === tempKey
              ? { ...u, id: data.id, status: "ready" }
              : u,
          ),
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.tempKey === tempKey
              ? {
                  ...u,
                  status: "error",
                  error: err instanceof Error ? err.message : String(err),
                }
              : u,
          ),
        );
      }
    }
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
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                u.status === "error"
                  ? "border-red-300/60 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10"
                  : "border-amber-300/60 bg-amber-50/80 dark:border-white/15 dark:bg-white/8"
              }`}
            >
              {u.status === "uploading" ? (
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
              <button
                className="text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/80"
                onClick={() => handleRemoveUpload(u)}
                aria-label="Remove attachment"
              >
                <Icon name="close" variant="round" className="text-xs" />
              </button>
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

  const boundProject = editorContext?.editorStates.project;
  const projectChip = boundProject ? (
    <div className="flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50/80 px-2 py-1 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
      <Icon
        name="folder"
        variant="round"
        className="text-sm text-amber-600 dark:text-amber-400"
      />
      <span className="max-w-[10rem] truncate text-default-800 dark:text-white/85">
        {boundProject}
      </span>
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

  function handleSend(text?: string) {
    const value = (text ?? inputText).trim();
    if (!value || isLoading) return;
    setInputText("");
    submit(value, getWorkflows());
  }

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

  const isEmptyConversation = messages.length === 0 && !isLoading;

  // ── Shared content ───────────────────────────────────────────────────────

  const emptyState = isPage ? (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-5 py-12">
      <div className="animate-pulse-glow flex h-20 w-20 items-center justify-center rounded-full bg-amber-100/70 p-3 dark:bg-amber-500/10">
        <img
          src="/assets/pulse-logo.svg"
          alt="Palmos"
          className="h-full w-full"
        />
      </div>
      <div className="text-center">
        <h2 className="text-default-800 text-lg font-semibold dark:text-white/90">
          What would you like to build?
        </h2>
        <p className="text-default-500 mt-1 text-sm dark:text-white/50">
          Describe your idea and Palmos AI will help you bring it to life.
        </p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-2 gap-2.5 pt-2 sm:grid-cols-3">
        {STARTER_PROMPTS.map((prompt) => (
          <StarterPromptButton
            key={prompt.label}
            prompt={prompt}
            onSend={handleSend}
          />
        ))}
      </div>

      {isLoadingAutomations ? (
        <div className="w-full max-w-xl shrink-0 pt-6">
          <p className="text-default-500 mb-3 text-xs font-medium tracking-wide uppercase">
            My Automations
          </p>
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
          </div>
        </div>
      ) : (
        <MyAutomationsCarousel
          automations={automations}
          onOpenEditor={(automation) => {
            editorContext?.updateModalStates({
              automationEditor: { isOpen: true, automation },
            });
          }}
          onCreateNew={() => {
            editorContext?.updateModalStates({
              automationEditor: { isOpen: true },
            });
          }}
        />
      )}

      {isLoadingMyWorkflows ? (
        <div className="w-full max-w-xl shrink-0 pt-6">
          <p className="text-default-500 mb-3 text-xs font-medium tracking-wide uppercase">
            My Workflows
          </p>
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
          </div>
        </div>
      ) : myWorkflows && myWorkflows.length > 0 ? (
        <MyWorkflowsCarousel workflows={myWorkflows} />
      ) : null}
    </div>
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="animate-pulse-glow flex h-16 w-16 items-center justify-center rounded-full bg-amber-100/60 p-2 dark:bg-amber-500/10">
        <img
          src="/assets/pulse-logo.svg"
          alt="Palmos"
          className="h-full w-full"
        />
      </div>
      <p className="text-default-500 text-sm dark:text-white/65">
        What would you like to build?
      </p>
      <div className="grid w-full grid-cols-2 gap-2 pt-2">
        {STARTER_PROMPTS.map((prompt) => (
          <StarterPromptButton
            key={prompt.label}
            prompt={prompt}
            onSend={handleSend}
          />
        ))}
      </div>
    </div>
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

    if (!content && spawned.length === 0 && !hasWidgets) return null;

    return (
      <div key={msg.id ?? i} className="flex flex-col gap-2.5">
        {isHuman ? (
          content && <UserBubble text={content} />
        ) : isPage ? (
          <AIResponseCard
            content={content}
            isStreaming={isLoading && i === messages.length - 1}
            widgets={widgets}
          />
        ) : (
          <ResponseCard
            content={content}
            isStreaming={isLoading && i === messages.length - 1}
            widgets={widgets}
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
    <div className="py-1.5">
      <div className="overflow-hidden rounded-xl border border-amber-200/40 shadow-sm dark:border-white/6">
        <p className="py-1.5 text-center text-xs text-amber-500/70 dark:text-amber-300/60">
          Palmos is thinking...
        </p>
      </div>
    </div>
  );

  const errorBanner = !!error && (
    <div className="rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
      {error instanceof Error ? error.message : "An error occurred."}
    </div>
  );

  const quickPillButtons = (
    <>
      <button
        className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200 dark:hover:shadow-[0_0_8px_rgba(251,191,36,0.2)]"
        onClick={() => handleSend("What can you help me with?")}
      >
        <Icon name="help" variant="round" className="text-xs" />
        Help
      </button>
      <button
        className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200 dark:hover:shadow-[0_0_8px_rgba(251,191,36,0.2)]"
        onClick={() => handleSend("Show me examples of Palmos Apps")}
      >
        <Icon name="lightbulb" variant="round" className="text-xs" />
        Examples
      </button>
    </>
  );

  // ── Page layout ──────────────────────────────────────────────────────────

  if (isPage) {
    return (
      <div className="relative flex h-full w-full flex-col bg-gray-50 dark:bg-[#0d0d14]">
        {/* Spacer matching the chat nav-bar height: py-2 (8px+8px) + h-14 (56px) = 72px */}
        <div
          className="flex shrink-0 items-end justify-end px-4 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]"
          style={{ height: 72 }}
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
          {isEmptyConversation && emptyState}
          {messageList}
          {workflowTasks.map((task) => (
            <WorkflowTaskCard key={task.taskId} task={task} onTerminate={handleTerminateTask} isTerminating={terminatingTaskIds.has(task.taskId)} />
          ))}
          {loadingIndicator}
          {errorBanner}
          <div className="h-2" />
        </div>

        {/* Todos */}
        {todos.length > 0 && (
          <div className="border-t border-amber-200/40 px-4 py-2 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8">
            <TodoList todos={todos} />
          </div>
        )}

        {/* Workflow card */}
        {latestWorkflow && (
          <div className="px-4 py-2 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]">
            <InlineWidget data={latestWorkflow} />
          </div>
        )}

        {/* Input */}
        <div className="flex flex-col gap-2 border-t border-amber-200/60 bg-white px-4 pt-3 pb-4 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8 dark:bg-white/3">
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
                  inputText.trim() ? "animate-pulse-send-glow" : ""
                }`}
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
              >
                <Icon
                  name="arrow_upward"
                  variant="round"
                  className="text-base"
                />
              </button>
            )}
          </div>
          <div className={`flex items-center pb-[max(env(safe-area-inset-bottom),0.25rem)] ${isPage ? "mt-2" : ""}`}>
            {projectChip}
            <div className="ml-auto flex gap-1.5">{quickPillButtons}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Panel layout ─────────────────────────────────────────────────────────

  return (
    <div className="relative grid h-full w-full grid-rows-[auto_1fr_max-content_max-content] overflow-hidden bg-gray-50 shadow-lg min-[768px]:rounded-xl dark:bg-[#111118]">
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
                <Button
                  isIconOnly
                  variant="light"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={onClose}
                >
                  <div>
                    <Icon name="close" variant="round" />
                  </div>
                </Button>
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
        className="flex flex-col gap-3 overflow-y-auto p-3"
      >
        {isEmptyConversation && emptyState}
        {messageList}
        {workflowTasks.map((task) => (
          <WorkflowTaskCard key={task.taskId} task={task} />
        ))}
        {loadingIndicator}
        {errorBanner}
      </div>

      {/* Todos */}
      {todos.length > 0 && <TodoList todos={todos} />}

      {/* Workflow card */}
      {latestWorkflow && (
        <div className="px-3 py-2">
          <InlineWidget data={latestWorkflow} />
        </div>
      )}

      {/* Input */}
      <div className="flex flex-col gap-2 border-t border-amber-200/60 bg-white px-3 pt-3 pb-2 dark:border-white/8 dark:bg-white/3">
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
              inputText.trim() && !isLoading ? "animate-pulse-send-glow" : ""
            }`}
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <div>
              <Icon name="arrow_upward" variant="round" className="text-base" />
            </div>
          </button>
        </div>
        <div className="flex items-center pb-[max(env(safe-area-inset-bottom),0.25rem)]">
          {projectChip}
          <div className="ml-auto flex gap-1.5">{quickPillButtons}</div>
        </div>
      </div>
    </div>
  );
}
