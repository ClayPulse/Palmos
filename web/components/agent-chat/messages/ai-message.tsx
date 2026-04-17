"use client";

import type { ChatBlockData, SubagentInfo, WorkflowTaskState } from "@/lib/types";
import ChatBlock from "../chat-blocks/chat-block";
import { TextBlock } from "../chat-blocks/text/text-block";

export function AIMessage({
  content,
  isStreaming,
  widgets,
  subagents,
  workflowTask,
  onTerminateTask,
  isTerminatingTask,
}: {
  content: string;
  isStreaming: boolean;
  widgets?: ChatBlockData[];
  subagents?: SubagentInfo[];
  workflowTask?: WorkflowTaskState;
  onTerminateTask?: (taskId: string) => void;
  isTerminatingTask?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <TextBlock type="ai" content={content} isStreaming={isStreaming} />
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
    </div>
  );
}
