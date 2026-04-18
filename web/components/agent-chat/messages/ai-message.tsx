"use client";

import type { ChatBlockData, SubagentInfo, WorkflowTaskState } from "@/lib/types";
import ChatBlock from "../chat-blocks/chat-block";
import { TextBlock } from "../chat-blocks/text/text-block";
import { parseSuggestions } from "@/lib/utils/parse-suggestions";

export function AIMessage({
  content,
  isStreaming,
  widgets,
  subagents,
  workflowTask,
  onTerminateTask,
  isTerminatingTask,
  onSuggestionClick,
  chosenSuggestion,
}: {
  content: string;
  isStreaming: boolean;
  widgets?: ChatBlockData[];
  subagents?: SubagentInfo[];
  workflowTask?: WorkflowTaskState;
  onTerminateTask?: (taskId: string) => void;
  isTerminatingTask?: boolean;
  onSuggestionClick?: (text: string) => void;
  chosenSuggestion?: string;
}) {
  const { text: displayContent, suggestions } = parseSuggestions(content);
  const hasSuggestions = !isStreaming && suggestions.length > 0;
  const isAnswered = !!chosenSuggestion;
  const showSuggestions = hasSuggestions && (onSuggestionClick || isAnswered);

  return (
    <div className="flex flex-col gap-2.5">
      <TextBlock type="ai" content={displayContent} isStreaming={isStreaming} />
      {widgets?.map((w, i) => <ChatBlock key={`widget-${i}`} data={w} />)}
      {subagents?.map((s) => (
        <ChatBlock key={s.id} data={{ type: "subagent", subagent: s }} />
      ))}
      {workflowTask && (
        <ChatBlock
          data={{
            type: "workflow-task",
            task: workflowTask,
            onTerminate: onTerminateTask,
            isTerminating: isTerminatingTask,
          }}
        />
      )}
      {showSuggestions && (
        <div className="mt-3 rounded-xl border border-purple-200/60 bg-purple-50/40 p-3 dark:border-purple-500/20 dark:bg-purple-500/5">
          <div className="mb-2 flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 text-purple-400 dark:text-purple-400/80"
            >
              <path
                fillRule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs font-semibold text-purple-500 dark:text-purple-400/80">
              {isAnswered ? "You chose" : "Try one of these"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {suggestions.map((s) => {
              const isChosen = isAnswered && s === chosenSuggestion;
              const isNotChosen = isAnswered && s !== chosenSuggestion;

              return (
                <button
                  key={s}
                  onClick={
                    !isAnswered && onSuggestionClick
                      ? () => onSuggestionClick(s)
                      : undefined
                  }
                  disabled={isAnswered}
                  className={`group flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                    isChosen
                      ? "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-300"
                      : isNotChosen
                        ? "border-transparent bg-white/40 text-default-400 opacity-50 dark:bg-white/[0.02] dark:text-white/30"
                        : "border-transparent bg-white/70 text-default-700 shadow-sm hover:border-purple-300 hover:bg-white hover:shadow-md dark:bg-white/5 dark:text-white/70 dark:hover:border-purple-500/40 dark:hover:bg-white/10"
                  }`}
                >
                  {isChosen && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className="flex-1">{s}</span>
                  {!isAnswered && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 shrink-0 text-default-300 transition-colors group-hover:text-purple-500 dark:text-white/20 dark:group-hover:text-purple-400"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
