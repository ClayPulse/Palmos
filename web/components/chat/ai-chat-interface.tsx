"use client";

import InlineWidget, {
  type InlineWidgetData,
  parseWidgetFromToolCall,
  parseWidgetFromToolMessage,
} from "@/components/chat/inline-widget";
import Icon from "@/components/misc/icon";
import MarkdownRender from "@/components/misc/markdown-render";
import { EditorContext } from "@/components/providers/editor-context-provider";
import useDeepAgent, { SubagentInfo, Todo, WorkflowInput } from "@/lib/hooks/use-deep-agent";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { Workflow } from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { AppModeEnum } from "@/lib/enums";
import { Button, Chip, Spinner } from "@heroui/react";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { motion } from "framer-motion";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

const agentUrl = process.env.NEXT_PUBLIC_BACKEND_URL + "/api/agent";

const STARTER_PROMPTS = [
  { icon: "contact_phone", label: "Automate my CRM" },
  { icon: "trending_up", label: "Create lead generation" },
  { icon: "language", label: "Make a website" },
  { icon: "dashboard", label: "Create a business dashboard" },
  { icon: "smart_toy", label: "Customize a digital employee" },
  { icon: "inventory_2", label: "Build an inventory tracker" },
];

type WorkflowTaskState = {
  taskId: string;
  workflowName: string;
  startedAt: number;
  status: "running" | "completed" | "failed";
  result?: any;
  error?: string;
};

export interface AIChatInterfaceProps {
  /** "panel" = narrow side-panel chrome; "page" = full-page layout */
  variant?: "panel" | "page";
  /** Callback for the close button (panel variant only) */
  onClose?: () => void;
}

export default function AIChatInterface({
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
    getSubagentsByMessage,
  } = useDeepAgent(agentUrl);

  const editorContext = useContext(EditorContext);
  const { workflows: myWorkflows, isLoading: isLoadingMyWorkflows } = useMarketplaceWorkflows("My Workflows");

  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const isPage = variant === "page";

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
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(poll);
            setWorkflowTasks((prev) =>
              prev.map((t) =>
                t.taskId === taskId
                  ? { ...t, status: data.status, result: data.result, error: data.error }
                  : t,
              ),
            );
          }
        } catch {
          // Network error — keep polling
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(poll);
        setWorkflowTasks((prev) =>
          prev.map((t) =>
            t.taskId === taskId && t.status === "running"
              ? { ...t, status: "failed", error: "Timed out after 1 hour" }
              : t,
          ),
        );
      }, 60 * 60 * 1000);
    }
  }, [messages]);

  function handleSend(text?: string) {
    const value = (text ?? inputText).trim();
    if (!value || isLoading) return;
    setInputText("");
    submit(value, getWorkflows());
  }

  const isEmptyConversation = messages.length === 0 && !isLoading;

  // ── Shared content ───────────────────────────────────────────────────────

  const emptyState = isPage ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12 min-h-0">
      <div className="animate-pulse-glow flex h-20 w-20 items-center justify-center rounded-full bg-amber-100/70 p-3 dark:bg-amber-500/10">
        <img src="/assets/pulse-logo.svg" alt="Palmos" className="h-full w-full" />
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

      {isLoadingMyWorkflows ? (
        <div className="w-full max-w-xl pt-6 shrink-0">
          <p className="text-default-500 mb-3 text-xs font-medium uppercase tracking-wide">
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
        <img src="/assets/pulse-logo.svg" alt="Palmos" className="h-full w-full" />
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
    if (widgets.length > 0 && nonCanvasWidgets.length === 0 && content.trimStart().startsWith("{")) {
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
      const content =
        typeof msg.content === "string"
          ? msg.content
          : "";
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

  const quickPills = (
    <div
      className={`flex justify-end gap-1.5 pb-[max(env(safe-area-inset-bottom),0.25rem)] ${isPage ? "mt-2" : ""}`}
    >
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
    </div>
  );

  // ── Page layout ──────────────────────────────────────────────────────────

  if (isPage) {
    return (
      <div className="flex h-full w-full flex-col bg-gray-50 dark:bg-[#0d0d14]">
        {/* Spacer matching the chat nav-bar height */}
        <div className="h-18 shrink-0" />

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]"
        >
          {isEmptyConversation && emptyState}
          {messageList}
          {workflowTasks.map((task) => (
            <WorkflowTaskCard key={task.taskId} task={task} />
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
        <div className="border-t border-amber-200/60 bg-white px-4 pt-3 pb-4 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8 dark:bg-white/3">
          <div className="flex items-end gap-2 rounded-xl border border-amber-300/60 bg-gray-50 px-3 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_14px_rgba(245,158,11,0.18)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_14px_rgba(251,191,36,0.22)]">
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
                <Icon name="arrow_upward" variant="round" className="text-base" />
              </button>
            )}
          </div>
          {quickPills}
        </div>
      </div>
    );
  }

  // ── Panel layout ─────────────────────────────────────────────────────────

  return (
    <div className="grid h-full w-full grid-rows-[auto_1fr_max-content_max-content] overflow-hidden bg-gray-50 shadow-lg dark:bg-[#111118] min-[768px]:rounded-xl">
      {/* Header + WIP disclaimer */}
      <div>
        <div className="relative">
          <div className="flex items-center justify-center border-b border-amber-300/40 bg-white px-3 py-3 dark:border-white/8 dark:bg-white/3">
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
          <Icon name="construction" variant="round" className="text-xs text-amber-600 dark:text-amber-400" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Work in progress</span> — some features may not fully function yet.
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
        <div className="flex items-end gap-2 rounded-lg border border-amber-300/60 bg-gray-50 px-2 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_12px_rgba(245,158,11,0.15)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_12px_rgba(251,191,36,0.2)]">
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
        {quickPills}
      </div>
    </div>
  );
}

// ── My Workflows Carousel ────────────────────────────────────────────────────

function MyWorkflowsCarousel({ workflows }: { workflows: Workflow[] }) {
  const ITEMS_PER_PAGE = 3;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(workflows.length / ITEMS_PER_PAGE);
  const visible = workflows.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );
  const { createCanvasTabView } = useTabViewManager();
  const editorContext = useContext(EditorContext);

  function openWorkflow(workflow: Workflow) {
    createCanvasTabView(
      {
        viewId: createCanvasViewId(),
        appConfigs: workflow.content.nodes.map((node) => node.data.config),
        initialWorkflowContent: workflow.content,
      },
      workflow,
    );
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Editor,
    }));
  }

  return (
    <div className="w-full max-w-xl pt-6 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-default-500 text-xs font-medium uppercase tracking-wide">
          My Workflows
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="relative z-10 h-6 w-6 flex items-center justify-center text-default-400 hover:text-default-700 disabled:opacity-30 transition-colors"
              disabled={page === 0}
              onClick={(e) => { e.stopPropagation(); setPage((p) => p - 1); }}
            >
              ‹
            </button>
            <span className="text-default-400 text-xs select-none">
              {page + 1}/{totalPages}
            </span>
            <button
              type="button"
              className="relative z-10 h-6 w-6 flex items-center justify-center text-default-400 hover:text-default-700 disabled:opacity-30 transition-colors"
              disabled={page === totalPages - 1}
              onClick={(e) => { e.stopPropagation(); setPage((p) => p + 1); }}
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {visible.map((wf) => (
          <div
            key={wf.id ?? wf.name}
            className="bg-content2 border-divider flex items-center justify-between rounded-lg border px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{wf.name}</p>
              {wf.description && (
                <p className="text-default-500 text-xs truncate mt-0.5">
                  {wf.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <Chip size="sm" variant="flat">
                v{wf.version}
              </Chip>
              <Button
                size="sm"
                variant="flat"
                color="primary"
                startContent={<Icon name="open_in_new" className="text-sm" />}
                onPress={() => openWorkflow(wf)}
              >
                Open
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Starter prompt button ────────────────────────────────────────────────────

function StarterPromptButton({
  prompt,
  onSend,
}: {
  prompt: { icon: string; label: string };
  onSend: (text: string) => void;
}) {
  return (
    <button
      className="group flex min-h-14 items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-[0_0_12px_rgba(245,158,11,0.12)] dark:border-white/10 dark:bg-white/6 dark:hover:border-amber-500/50 dark:hover:bg-white/10 dark:hover:shadow-[0_0_12px_rgba(251,191,36,0.12)]"
      onClick={() => onSend(prompt.label)}
    >
      <div className="flex shrink-0 items-center justify-center">
        <Icon
          name={prompt.icon}
          className="text-xl leading-none text-amber-600/70 transition-colors group-hover:text-amber-600 dark:text-amber-400/70 dark:group-hover:text-amber-300"
        />
      </div>
      <span className="text-default-700 group-hover:text-default-900 text-xs leading-snug transition-colors dark:text-white/70 dark:group-hover:text-white/90">
        {prompt.label}
      </span>
    </button>
  );
}

// ── User bubble ──────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm text-white shadow-sm">
        <p className="text-xs font-semibold text-white/80">User:</p>
        <p className="mt-0.5 text-white">{text}</p>
      </div>
    </div>
  );
}

// ── AI response card — inline bubble (used in page variant) ──────────────────

function AIResponseCard({
  content,
  isStreaming,
  widgets = [],
}: {
  content: string;
  isStreaming: boolean;
  widgets?: InlineWidgetData[];
}) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[88%] gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 p-1 dark:bg-amber-500/15">
          <img
            src="/assets/pulse-logo.svg"
            alt="Palmos"
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-default-400 dark:text-white/40">
            AI Manager:
          </p>
          {content && (
            <div className="text-default-800 rounded-2xl rounded-tl-sm border border-amber-200/60 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-white/10 dark:bg-white/6 dark:text-white/85">
              <MarkdownRender content={content} />
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-amber-500 align-text-bottom" />
              )}
            </div>
          )}
          {widgets.map((w, wi) => (
            <InlineWidget key={wi} data={w} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Response card — collapsible (used in panel variant) ──────────────────────

function ResponseCard({
  content,
  isStreaming,
  widgets = [],
}: {
  content: string;
  isStreaming: boolean;
  widgets?: InlineWidgetData[];
}) {
  const [expanded, setExpanded] = useState(true);
  const status: "running" | "complete" = isStreaming ? "running" : "complete";

  return (
    <div className="rounded-lg border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className="text-default-700 text-xs font-semibold dark:text-white/90">
            AI Manager
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <Icon
            name={expanded ? "expand_less" : "expand_more"}
            variant="round"
            className="text-default-400 text-sm dark:text-white/50"
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-200/60 dark:border-white/8">
          {content && (
            <div className="px-3 py-2.5">
              <MarkdownRender content={content} />
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-amber-500 align-text-bottom" />
              )}
            </div>
          )}
          {widgets.length > 0 && (
            <div className="px-3 pb-3">
              {widgets.map((w, wi) => (
                <InlineWidget key={wi} data={w} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: "pending" | "running" | "complete" | "error";
}) {
  const styles = {
    pending: "bg-default-100 text-default-500 dark:bg-white/10 dark:text-white/50",
    running: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    complete: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    error: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

// ── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({
  status,
}: {
  status: "pending" | "running" | "complete" | "error";
}) {
  switch (status) {
    case "pending":
      return <span className="text-default-300 text-sm dark:text-white/30">○</span>;
    case "running":
      return <Spinner size="sm" />;
    case "complete":
      return (
        <Icon
          name="check_circle"
          variant="round"
          className="text-sm text-green-500 dark:text-green-400"
        />
      );
    case "error":
      return (
        <Icon
          name="error"
          variant="round"
          className="text-sm text-red-500 dark:text-red-400"
        />
      );
  }
}

// ── Subagent card ─────────────────────────────────────────────────────────────

function SubagentCard({ subagent }: { subagent: SubagentInfo }) {
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
      <Icon name="check_circle" variant="round" className="text-sm text-green-500" />
    ) : subagent.status === "error" ? (
      <Icon name="error" variant="round" className="text-sm text-red-500" />
    ) : (
      <span className="text-default-300 text-xs dark:text-white/30">○</span>
    );

  return (
    <div className="rounded-lg border border-amber-200/60 bg-white text-xs shadow-sm dark:border-white/10 dark:bg-white/6">
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
              <span className="text-amber-500/60 dark:text-amber-300/80">Working...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Todo list ─────────────────────────────────────────────────────────────────

function TodoList({ todos }: { todos: Todo[] }) {
  const completed = todos.filter((t) => t.status === "completed").length;
  const progress = todos.length > 0 ? (completed / todos.length) * 100 : 0;

  return (
    <div className="border-t border-amber-200/60 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
          <Icon name="electric_bolt" className="text-xs text-amber-600 dark:text-amber-300" />
          Tasks
        </span>
        <span className="text-default-400 dark:text-white/55">
          {completed}/{todos.length}
        </span>
      </div>
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
        {todos.map((todo, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            {todo.status === "completed" ? (
              <Icon
                name="check_circle"
                variant="round"
                className="mt-px shrink-0 text-sm text-green-500"
              />
            ) : todo.status === "in_progress" ? (
              <Spinner size="sm" className="mt-px shrink-0" />
            ) : (
              <span className="text-default-300 mt-0.5 shrink-0 dark:text-white/30">○</span>
            )}
            <span
              className={
                todo.status === "completed"
                  ? "text-default-400 line-through dark:text-white/40"
                  : "text-default-700 dark:text-white/80"
              }
            >
              {todo.content}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Workflow task card ────────────────────────────────────────────────────────

function WorkflowTaskCard({ task }: { task: WorkflowTaskState }) {
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

  const displayElapsed = task.status === "running" ? elapsed : (finalElapsed ?? elapsed);
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
          <Icon name="check_circle" variant="round" className="text-lg text-green-500 dark:text-green-400" />
        ) : (
          <Icon name="error" variant="round" className="text-lg text-red-500 dark:text-red-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-default-800 dark:text-white/85 truncate">
            {task.workflowName}
          </p>
          <p className="text-xs text-default-500 dark:text-white/50">
            {isRunning
              ? `Running... ${timeStr}`
              : isCompleted
                ? `Completed in ${timeStr}`
                : `Failed after ${timeStr}`}
          </p>
        </div>
      </div>
      {isCompleted && task.result != null && (
        <WorkflowResultBody result={task.result} workflowName={task.workflowName} />
      )}
      {isFailed && task.error && (
        <div className="border-t border-red-200/60 bg-white/60 px-3.5 py-2 dark:border-red-500/15 dark:bg-white/3">
          <p className="text-xs text-red-600 dark:text-red-400">{task.error}</p>
        </div>
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
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
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
function findDataUri(obj: unknown): { mime: string; base64: string; dataUri: string } | null {
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

function WorkflowResultBody({
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
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{errorMsg}</p>
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
          <span className="min-w-0 flex-1 truncate text-xs text-default-700 dark:text-white/70">
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
      <pre className="max-h-48 overflow-auto text-xs text-default-700 dark:text-white/70 whitespace-pre-wrap break-all">
        {textContent}
      </pre>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLastAIContent(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg._getType() === "ai") {
      const content = msg.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .filter(
            (b): b is { type: "text"; text: string } =>
              typeof b === "object" &&
              b !== null &&
              "type" in b &&
              b.type === "text",
          )
          .map((b) => b.text)
          .join("");
      }
    }
  }
  return "";
}
