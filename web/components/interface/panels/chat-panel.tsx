"use client";

import Icon from "@/components/misc/icon";
import MarkdownRender from "@/components/misc/markdown-render";
import { EditorContext } from "@/components/providers/editor-context-provider";
import useDeepAgent, {
  SubagentInfo,
  Todo,
} from "@/lib/hooks/use-deep-agent";
import { Button, Spinner } from "@heroui/react";
import { BaseMessage } from "@langchain/core/messages";
import { motion } from "framer-motion";
import { useContext, useEffect, useRef, useState } from "react";
import BaseSidePanel from "./base-side-panel";

const agentUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL + "/api/agent";

const STARTER_PROMPTS = [
  { icon: "contact_phone", label: "Automate my CRM" },
  { icon: "trending_up", label: "Create lead generation" },
  { icon: "language", label: "Make a website" },
  { icon: "dashboard", label: "Create a business dashboard" },
  { icon: "smart_toy", label: "Customize a digital employee" },
  { icon: "inventory_2", label: "Build an inventory tracker" },
];

export default function ChatPanel() {
  const editorContext = useContext(EditorContext);
  const {
    messages,
    isLoading,
    error,
    todos,
    submit,
    stop,
    getSubagentsByMessage,
  } = useDeepAgent(agentUrl);

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const isOpen = editorContext?.editorStates.isChatPanelOpen ?? false;

  // Track user scroll intent via wheel events only (avoids race with programmatic scroll)
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

  useEffect(() => {
    if (userScrolledUpRef.current) return;
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, todos]);

  function handleSend(text?: string) {
    const value = (text ?? inputText).trim();
    if (!value || isLoading) return;
    setInputText("");
    submit(value);
  }

  const isEmptyConversation = messages.length === 0 && !isLoading;

  return (
    <BaseSidePanel isOpen={isOpen} direction="right">
      <div className="h-full w-full overflow-y-hidden min-[768px]:py-2 min-[768px]:pr-2 min-[768px]:pl-1">
        <div className="grid h-full w-full grid-rows-[auto_1fr_max-content_max-content] overflow-hidden bg-gray-50 shadow-lg dark:bg-[#111118] min-[768px]:rounded-xl">

          {/* Header — animated amber gradient shimmer matching Vibe Code button */}
          <div className="relative">
            <div className="flex items-center justify-center border-b border-amber-300/40 bg-white px-3 py-3 dark:border-white/8 dark:bg-white/3">
              <div className="flex items-center gap-2">
                <motion.span
                  className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                  animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <div><Icon name="bolt" className="text-lg" /></div>
                </motion.span>
                <motion.span
                  className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-sm font-bold tracking-wide text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
                  animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  PULSE AI
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
                    <div><Icon name="stop" variant="round" /></div>
                  </Button>
                )}
                <Button
                  isIconOnly
                  variant="light"
                  className="text-default-400 hover:text-default-600 dark:text-white/50 dark:hover:text-white/80"
                  onPress={() =>
                    editorContext?.setEditorStates((prev) => ({
                      ...prev,
                      isChatPanelOpen: false,
                    }))
                  }
                >
                  <div><Icon name="close" variant="round" /></div>
                </Button>
              </div>
            </div>
          </div>

          {/* Messages + Subagents */}
          <div ref={scrollContainerRef} className="flex flex-col gap-3 overflow-y-auto p-3">
            {isEmptyConversation && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                {/* Pulsing logo */}
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100/60 p-2 animate-pulse-glow dark:bg-amber-500/10">
                  <img src="/assets/pulse-logo.svg" alt="Pulse" className="h-full w-full" />
                </div>
                <p className="text-sm text-default-500 dark:text-white/65">
                  What would you like to build?
                </p>

                {/* Starter Prompt Cards */}
                <div className="grid w-full grid-cols-2 gap-2 pt-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      className="group flex min-h-[3rem] items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-[0_0_12px_rgba(245,158,11,0.12)] dark:border-white/10 dark:bg-white/6 dark:hover:border-amber-500/50 dark:hover:bg-white/10 dark:hover:shadow-[0_0_12px_rgba(251,191,36,0.12)]"
                      onClick={() => handleSend(prompt.label)}
                    >
                      <div className="shrink-0 flex items-center justify-center"><Icon
                        name={prompt.icon}
                        className="text-xl leading-none text-amber-600/70 transition-colors group-hover:text-amber-600 dark:text-amber-400/70 dark:group-hover:text-amber-300"
                      /></div>
                      <span className="text-xs leading-snug text-default-700 transition-colors group-hover:text-default-900 dark:text-white/70 dark:group-hover:text-white/90">
                        {prompt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
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

              const spawned = msg.id
                ? getSubagentsByMessage(msg.id)
                : [];

              if (!content && spawned.length === 0) return null;

              return (
                <div key={msg.id ?? i} className="flex flex-col gap-2">
                  {isHuman ? (
                    content && <MessageBubble isUser text={content} />
                  ) : (
                    <ResponseCard
                      content={content}
                      isStreaming={isLoading && i === messages.length - 1}
                    />
                  )}
                  {spawned.length > 0 && (
                    <div className="ml-3 flex flex-col gap-1.5 border-l-2 border-amber-400/30 pl-3 dark:border-amber-500/30">
                      {spawned.map((sa) => (
                        <SubagentCard key={sa.id} subagent={sa} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="py-1.5">
                <div className="overflow-hidden rounded-xl border border-amber-200/40 shadow-sm dark:border-white/6">
                  <p className="py-1.5 text-center text-xs text-amber-500/70 dark:text-amber-300/60">
                    Pulse is thinking...
                  </p>
                </div>
              </div>
            )}

            {!!error && (
              <div className="rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error instanceof Error
                  ? error.message
                  : "An error occurred."}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Todo List */}
          {todos.length > 0 && <TodoList todos={todos} />}

          {/* Input */}
          <div className="flex flex-col gap-2 border-t border-amber-200/60 bg-white px-3 pt-3 pb-2 dark:border-white/8 dark:bg-white/3">
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-gray-50 px-2 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_12px_rgba(245,158,11,0.15)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <input
                className="flex-1 bg-transparent py-2.5 text-sm text-default-900 placeholder-default-500 outline-none dark:text-white dark:placeholder-white/45"
                placeholder="Ask Pulse AI..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isLoading}
              />
              <button
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white transition-all disabled:opacity-30 ${
                  inputText.trim() && !isLoading ? "animate-pulse-send-glow" : ""
                }`}
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
              >
                <div><Icon name="arrow_upward" variant="round" className="text-base" /></div>
              </button>
            </div>

            {/* Quick-action pills */}
            <div className="flex justify-end gap-1.5 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
              <button
                className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200 dark:hover:shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                onClick={() => handleSend("What can you help me with?")}
              >
                <div><Icon name="help" variant="round" className="text-xs" /></div>
                Help
              </button>
              <button
                className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200 dark:hover:shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                onClick={() => handleSend("Show me examples of Pulse Apps")}
              >
                <div><Icon name="lightbulb" variant="round" className="text-xs" /></div>
                Examples
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseSidePanel>
  );
}

// ── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ isUser, text }: { isUser: boolean; text: string }) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
          isUser
            ? "bg-linear-to-r from-amber-500 to-orange-500 text-white"
            : "border border-amber-200 bg-white text-default-800 shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-white"
        }`}
      >
        {isUser ? text : <MarkdownRender content={text} />}
      </div>
    </div>
  );
}

// ── Response Card ───────────────────────────────────────────────────────────

function ResponseCard({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
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
          <span className="text-xs font-semibold text-default-700 dark:text-white/90">
            Pulse AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <div>
            <Icon
              name={expanded ? "expand_less" : "expand_more"}
              variant="round"
              className="text-sm text-default-400 dark:text-white/50"
            />
          </div>
        </div>
      </button>

      {expanded && content && (
        <div className="border-t border-amber-200/60 px-3 py-2.5 dark:border-white/8">
          <div className="prose prose-sm max-w-none text-sm text-default-800 dark:text-white/85">
            <MarkdownRender content={content} />
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-amber-500 align-text-bottom" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ── Subagent Card ───────────────────────────────────────────────────────────

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

  return (
    <div className="rounded-lg border border-amber-200/60 bg-white text-xs shadow-sm dark:border-white/10 dark:bg-white/6">
      <button
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <StatusIcon status={subagent.status} />
        <span className="flex-1 truncate font-medium text-default-700 dark:text-white/90">{agentType}</span>
        {elapsed > 0 && (
          <span className="tabular-nums text-default-400 dark:text-white/50">{elapsed}s</span>
        )}
        <div><Icon
          name={isExpanded ? "expand_less" : "expand_more"}
          variant="round"
          className="text-sm text-default-400 dark:text-white/50"
        /></div>
      </button>

      {isExpanded && (
        <div className="space-y-1 border-t border-amber-200/60 px-2.5 py-2 dark:border-white/8">
          <p className="text-default-500 dark:text-white/65">{description}</p>
          {latestContent && (
            <div className="mt-1 text-default-600 dark:text-white/80">
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

function StatusIcon({
  status,
}: {
  status: "pending" | "running" | "complete" | "error";
}) {
  switch (status) {
    case "pending":
      return (
        <span className="text-sm text-default-300 dark:text-white/30" title="Pending">
          ○
        </span>
      );
    case "running":
      return <Spinner size="sm" />;
    case "complete":
      return (
        <span className="text-sm text-amber-500 dark:text-amber-400" title="Complete">
          ⚡
        </span>
      );
    case "error":
      return (
        <span className="text-sm text-red-500 dark:text-red-400" title="Error">
          ✕
        </span>
      );
  }
}

function getLastAIContent(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg._getType() === "ai" && typeof msg.content === "string") {
      return msg.content;
    }
  }
  return "";
}

// ── Todo List ───────────────────────────────────────────────────────────────

function TodoList({ todos }: { todos: Todo[] }) {
  const completed = todos.filter((t) => t.status === "completed").length;
  const pct = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;

  return (
    <div className="border-t border-amber-200/60 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-amber-700 dark:text-amber-300">
          <div className="mr-1 inline-flex"><Icon name="electric_bolt" className="text-xs text-amber-600 dark:text-amber-300" /></div>
          Tasks
        </span>
        <span className="text-default-400 dark:text-white/55">
          {completed}/{todos.length}
        </span>
      </div>
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex max-h-36 flex-col gap-1 overflow-y-auto">
        {todos.map((todo, i) => (
          <TodoItem key={i} todo={todo} />
        ))}
      </div>
    </div>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const iconMap = {
    pending: { icon: "○", className: "text-default-400 dark:text-white/40" },
    in_progress: { icon: "⚡", className: "text-amber-600 dark:text-amber-300 animate-pulse" },
    completed: { icon: "✓", className: "text-amber-600 dark:text-amber-300" },
  };
  const { icon, className } = iconMap[todo.status];

  return (
    <div className="flex items-start gap-1.5 text-xs transition-all duration-300">
      <span className={className}>{icon}</span>
      <span
        className={
          todo.status === "completed"
            ? "text-default-500 line-through dark:text-white/40"
            : "text-default-700 dark:text-white/75"
        }
      >
        {todo.content}
      </span>
    </div>
  );
}
