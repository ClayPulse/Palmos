"use client";

import Icon from "@/components/misc/icon";
import MarkdownRender from "@/components/misc/markdown-render";
import useDeepAgent, { SubagentInfo, Todo } from "@/lib/hooks/use-deep-agent";
import { Spinner } from "@heroui/react";
import { useEffect, useRef, useState } from "react";

const agentUrl = process.env.NEXT_PUBLIC_BACKEND_URL + "/api/agent";

const STARTER_PROMPTS = [
  { icon: "contact_phone", label: "Automate my CRM" },
  { icon: "trending_up", label: "Create lead generation" },
  { icon: "language", label: "Make a website" },
  { icon: "dashboard", label: "Create a business dashboard" },
  { icon: "smart_toy", label: "Customize a digital employee" },
  { icon: "inventory_2", label: "Build an inventory tracker" },
];

export default function ChatView() {
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

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
    <div className="flex h-full w-full flex-col bg-gray-50 dark:bg-[#0d0d14]">
      {/* Spacer matching ChatNavBar height (h-14 + py-2×2 = 4.5rem) */}
      <div className="h-18 shrink-0" />

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))]"
      >
        {isEmptyConversation && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12">
            <div className="animate-pulse-glow flex h-20 w-20 items-center justify-center rounded-full bg-amber-100/70 p-3 dark:bg-amber-500/10">
              <img
                src="/assets/pulse-logo.svg"
                alt="Pulse"
                className="h-full w-full"
              />
            </div>
            <div className="text-center">
              <h2 className="text-default-800 text-lg font-semibold dark:text-white/90">
                What would you like to build?
              </h2>
              <p className="text-default-500 mt-1 text-sm dark:text-white/50">
                Describe your idea and Pulse AI will help you bring it to life.
              </p>
            </div>

            <div className="grid w-full max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-3">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  className="group flex min-h-14 items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-3 py-3 text-left shadow-sm transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-[0_0_14px_rgba(245,158,11,0.14)] dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-500/50 dark:hover:bg-white/10"
                  onClick={() => handleSend(prompt.label)}
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

          const spawned = msg.id ? getSubagentsByMessage(msg.id) : [];
          if (!content && spawned.length === 0) return null;

          return (
            <div key={msg.id ?? i} className="flex flex-col gap-2.5">
              {isHuman ? (
                content && <UserBubble text={content} />
              ) : (
                <AIResponseCard
                  content={content}
                  isStreaming={isLoading && i === messages.length - 1}
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
        })}

        {isLoading && messages.length === 0 && (
          <div className="flex justify-center py-4">
            <Spinner size="sm" color="warning" />
          </div>
        )}

        {!!error && (
          <div className="rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {error instanceof Error ? error.message : "An error occurred."}
          </div>
        )}

        {/* Spacer so last message isn't hidden behind input */}
        <div className="h-2" />
      </div>

      {/* Todo list */}
      {todos.length > 0 && (
        <div className="border-t border-amber-200/40 px-4 py-2 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8">
          <TodoList todos={todos} />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-amber-200/60 bg-white px-4 pt-3 pb-4 sm:px-8 md:px-16 lg:px-[max(4rem,calc(50%-36rem))] dark:border-white/8 dark:bg-white/3">
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/60 bg-gray-50 px-3 shadow-sm transition-shadow focus-within:border-amber-500 focus-within:shadow-[0_0_14px_rgba(245,158,11,0.18)] dark:border-white/15 dark:bg-white/8 dark:focus-within:border-amber-400/70 dark:focus-within:shadow-[0_0_14px_rgba(251,191,36,0.22)]">
          <input
            className="text-default-900 placeholder-default-500 flex-1 bg-transparent py-3 text-sm outline-none dark:text-white dark:placeholder-white/45"
            placeholder="Ask Pulse AI anything..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            autoFocus
          />
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

        <div className="mt-2 flex justify-end gap-1.5 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
          <button
            className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
            onClick={() => handleSend("What can you help me with?")}
          >
            <Icon name="help" variant="round" className="text-xs" />
            Help
          </button>
          <button
            className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
            onClick={() => handleSend("Show me examples of Pulse Apps")}
          >
            <Icon name="lightbulb" variant="round" className="text-xs" />
            Examples
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User bubble ─────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm text-white shadow-sm">
        {text}
      </div>
    </div>
  );
}

// ── AI response card ────────────────────────────────────────────────────────

function AIResponseCard({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[88%] gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 p-1 dark:bg-amber-500/15">
          <img
            src="/assets/pulse-logo.svg"
            alt="Pulse"
            className="h-full w-full"
          />
        </div>
        <div className="text-default-800 rounded-2xl rounded-tl-sm border border-amber-200/60 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-white/10 dark:bg-white/6 dark:text-white/85">
          <MarkdownRender content={content} />
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-amber-500 align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subagent card ───────────────────────────────────────────────────────────

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
      <Icon
        name="check_circle"
        variant="round"
        className="text-sm text-green-500"
      />
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
              <span className="text-amber-500/60 dark:text-amber-300/80">
                Working...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Todo list ───────────────────────────────────────────────────────────────

function TodoList({ todos }: { todos: Todo[] }) {
  const completed = todos.filter((t) => t.status === "completed").length;
  const progress = todos.length > 0 ? (completed / todos.length) * 100 : 0;

  return (
    <div className="rounded-lg border border-amber-200/60 bg-white p-2.5 dark:border-white/10 dark:bg-white/5">
      <div className="text-default-500 mb-2 flex items-center justify-between text-xs dark:text-white/50">
        <span className="font-medium">Tasks</span>
        <span>
          {completed}/{todos.length}
        </span>
      </div>
      <div className="bg-default-100 mb-2.5 h-1 w-full overflow-hidden rounded-full dark:bg-white/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="space-y-1">
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
              <span className="text-default-300 mt-0.5 shrink-0 dark:text-white/30">
                ○
              </span>
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

function getLastAIContent(
  messages: import("@langchain/core/messages").BaseMessage[],
): string {
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
