"use client";

import Icon from "@/components/misc/icon";
import type { ChatBlockData } from "@/lib/types";

export function MCPResultBlock({
  data,
}: { data: Extract<ChatBlockData, { type: "mcp-result" }> }) {
  const resultStr =
    typeof data.result === "string"
      ? data.result
      : JSON.stringify(data.result, null, 2);

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
      <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
        <Icon
          name="hub"
          variant="round"
          className="text-xs text-amber-600 dark:text-amber-300"
        />
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          MCP
          {data.serverName ? ` · ${data.serverName}` : ""}
        </span>
        <span className="ml-auto rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-mono text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          {data.toolName}
        </span>
      </div>
      <pre className="max-h-64 overflow-auto p-3 text-[11px] leading-relaxed text-gray-700 dark:text-white/70">
        {resultStr}
      </pre>
    </div>
  );
}
