import type { BaseMessage } from "@langchain/core/messages";

export type WorkflowTaskState = {
  taskId: string;
  workflowName: string;
  startedAt: number;
  status: "running" | "completed" | "failed";
  result?: any;
  error?: string;
  isManagedAgent?: boolean;
  latestProgress?: string;
};

export function getLastAIContent(messages: BaseMessage[]): string {
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
