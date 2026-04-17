"use client";

import type { ChatBlockBaseProps } from "@/components/agent-chat/types";
import type { ChatBlockData } from "@/lib/types";
import { A2UIBlock } from "./a2ui/a2ui-block";
import { MCPResultBlock } from "./mcp-result/mcp-result-block";
import { PulseAppBlock } from "./pulse-app/pulse-app-block";
import { CanvasBlock } from "./canvas/canvas-block";
import { DiagramBlock } from "./diagram/diagram-block";

export type { ChatBlockData };
export { parseWidgetFromToolCall, parseWidgetFromToolMessage } from "./utils";

export default function Block({ data }: ChatBlockBaseProps) {
  switch (data.type) {
    case "a2ui":
      return <A2UIBlock data={data} />;
    case "mcp-result":
      return <MCPResultBlock data={data} />;
    case "pulse-app":
      return <PulseAppBlock data={data} />;
    case "canvas":
      return <CanvasBlock data={data} />;
    case "diagram":
      return <DiagramBlock data={data} />;
    default:
      return null;
  }
}
