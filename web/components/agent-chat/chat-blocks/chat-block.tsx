"use client";

import type { ChatBlockBaseProps } from "@/lib/types";
import { AIMessage } from "../messages/ai-message";
import { UserMessage } from "../messages/user-message";
import { A2UIBlock } from "./a2ui/a2ui-block";
import { CanvasBlock } from "./canvas/canvas-block";
import { DiagramBlock } from "./diagram/diagram-block";
import InterruptBlock from "./interrupt/interrupt-block";
import { MCPResultBlock } from "./mcp-result/mcp-result-block";
import { PulseAppBlock } from "./pulse-app/pulse-app-block";
import { SubagentBlock } from "./subagent/subagent-block";
import { TodoListBlock } from "./todo-list/todo-list-block";
import { ToolCallBlock } from "./tool-call/tool-call-block";
import { WorkflowTaskBlock } from "./workflow-task/workflow-task-block";

export default function ChatBlock({ data }: ChatBlockBaseProps) {
  switch (data.type) {
    case "a2ui":
    case "a2ui-stream":
      return <A2UIBlock data={data} />;
    case "mcp-result":
      return <MCPResultBlock data={data} />;
    case "pulse-app":
      return <PulseAppBlock data={data} />;
    case "canvas":
      return <CanvasBlock data={data} />;
    case "diagram":
      return <DiagramBlock data={data} />;
    case "interrupt":
      return (
        <InterruptBlock
          interrupt={data.interrupt}
          onReply={data.onReply}
          isLoading={data.isLoading}
        />
      );
    case "workflow-task":
      return (
        <WorkflowTaskBlock
          task={data.task}
          onTerminate={data.onTerminate}
          isTerminating={data.isTerminating}
        />
      );
    case "subagent":
      return <SubagentBlock subagent={data.subagent} />;
    case "todo-list":
      return <TodoListBlock todos={data.todos} />;
    case "tool-call":
      return <ToolCallBlock names={data.toolCallNames} />;
    case "user-message":
      return (
        <UserMessage
          text={data.text}
          attachmentCount={data.attachmentCount}
          uploadIds={data.uploadIds}
        />
      );
    case "ai-message":
      return (
        <AIMessage
          content={data.content}
          isStreaming={data.isStreaming}
          widgets={data.widgets}
          subagents={data.subagents}
          workflowTask={data.workflowTask}
          onTerminateTask={data.onTerminateTask}
          isTerminatingTask={data.isTerminatingTask}
        />
      );
    default:
      return null;
  }
}
