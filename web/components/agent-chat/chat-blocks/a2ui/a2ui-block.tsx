"use client";

import Icon from "@/components/misc/icon";
import type { A2UIStreamRendererProps } from "@/components/agent-chat/types";
import type { ChatBlockProps } from "@/lib/types";
import {
  A2UIProvider,
  A2UIRenderer,
  A2UIViewer,
  initializeDefaultCatalog,
  useA2UI as useA2UIHook,
  type A2UIClientEventMessage,
} from "@a2ui/react";
import { useCallback, useMemo } from "react";

// Initialize the A2UI component catalog once
initializeDefaultCatalog();

/** Processes pre-provided A2UI messages and renders the surface. */
function A2UIStreamRenderer({ messages }: A2UIStreamRendererProps) {
  const { processMessages } = useA2UIHook();

  // Process messages once on mount
  useMemo(() => {
    if (messages.length > 0) {
      processMessages(messages as Parameters<typeof processMessages>[0]);
    }
  }, [messages, processMessages]);

  return (
    <A2UIRenderer
      surfaceId="main"
      fallback={
        <p className="text-xs text-gray-400 dark:text-white/40">
          Rendering UI…
        </p>
      }
    />
  );
}

export function A2UIBlock({ data }: ChatBlockProps) {
  const handleAction = useCallback(
    async (message: A2UIClientEventMessage) => {
      const agentUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!agentUrl) return;
      try {
        await fetch(`${agentUrl}/api/a2ui/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
      } catch {
        // silent
      }
    },
    [],
  );

  if (data.a2ui) {
    return (
      <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
        <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
          <Icon
            name="language"
            variant="round"
            className="text-xs text-amber-600 dark:text-amber-300"
          />
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            A2UI
          </span>
        </div>
        <div className="p-3">
          <A2UIViewer
            root={data.a2ui.root}
            components={data.a2ui.components}
            data={data.a2ui.data}
            onAction={(action) => console.log("A2UI action:", action)}
          />
        </div>
      </div>
    );
  }

  if (data.a2uiMessages) {
    return (
      <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
        <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
          <Icon
            name="language"
            variant="round"
            className="text-xs text-amber-600 dark:text-amber-300"
          />
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            A2UI
          </span>
        </div>
        <div className="p-3">
          <A2UIProvider onAction={handleAction}>
            <A2UIStreamRenderer messages={data.a2uiMessages} />
          </A2UIProvider>
        </div>
      </div>
    );
  }

  return null;
}
