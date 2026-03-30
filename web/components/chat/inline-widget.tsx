"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { AppViewConfig, CanvasViewConfig } from "@/lib/types";
import { createAppViewId, createCanvasViewId } from "@/lib/views/view-helpers";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import {
  A2UIProvider,
  A2UIRenderer,
  A2UIViewer,
  initializeDefaultCatalog,
  useA2UI as useA2UIHook,
  type A2UIClientEventMessage,
  type ComponentInstance,
} from "@a2ui/react";
import { useCallback, useContext, useMemo } from "react";
import { MemoizedCanvasView } from "../views/editor/canvas/canvas-view";

// Initialize the A2UI component catalog once
initializeDefaultCatalog();

// ── Types ────────────────────────────────────────────────────────────────────

/** Parsed widget descriptor extracted from a tool call or tool result. */
export interface InlineWidgetData {
  type: "a2ui" | "mcp-result" | "pulse-app" | "canvas";
  /** A2UI: component definitions for A2UIViewer */
  a2ui?: {
    root: string;
    components: ComponentInstance[];
    data?: Record<string, unknown>;
  };
  /** A2UI: raw server-to-client messages for streaming surfaces */
  a2uiMessages?: unknown[];
  /** MCP: tool call result */
  mcp?: {
    toolName: string;
    serverName?: string;
    result: unknown;
  };
  /** Pulse App: app ID to embed */
  pulseApp?: {
    appId: string;
  };
  /** Canvas: node/edge data to render */
  canvas?: {
    nodes?: unknown[];
    edges?: unknown[];
  };
}

/**
 * Try to parse an inline widget from an AI tool_call or a ToolMessage content.
 *
 * Tool names the agent can use:
 *  - `render_a2ui`  → A2UI widget
 *  - `mcp_tool_result` → MCP tool output
 *  - `render_pulse_app` → embed a Pulse App
 *  - `render_canvas` → workflow canvas snippet
 */
export function parseWidgetFromToolCall(
  toolName: string,
  args: Record<string, unknown>,
): InlineWidgetData | null {
  switch (toolName) {
    case "render_a2ui":
    case "a2ui_render":
    case "show_ui": {
      if (args.components && args.root) {
        return {
          type: "a2ui",
          a2ui: {
            root: args.root as string,
            components: args.components as ComponentInstance[],
            data: (args.data as Record<string, unknown>) ?? undefined,
          },
        };
      }
      if (args.messages) {
        return {
          type: "a2ui",
          a2uiMessages: args.messages as unknown[],
        };
      }
      return null;
    }

    case "mcp_tool_result":
    case "mcp_call":
    case "call_mcp_tool": {
      return {
        type: "mcp-result",
        mcp: {
          toolName: (args.tool_name as string) ?? toolName,
          serverName: args.server_name as string | undefined,
          result: args.result ?? args.output ?? args,
        },
      };
    }

    case "render_pulse_app":
    case "open_pulse_app":
    case "show_app": {
      const appId = (args.app_id ?? args.appId ?? args.app) as string;
      if (!appId) return null;
      return {
        type: "pulse-app",
        pulseApp: { appId },
      };
    }

    case "render_canvas":
    case "show_canvas":
    case "show_workflow": {
      return {
        type: "canvas",
        canvas: {
          nodes: args.nodes as unknown[] | undefined,
          edges: args.edges as unknown[] | undefined,
        },
      };
    }

    default:
      return null;
  }
}

/**
 * Try to parse widget data from a ToolMessage's content (JSON string).
 */
export function parseWidgetFromToolMessage(
  toolCallId: string,
  content: string,
  toolName?: string,
): InlineWidgetData | null {
  // If we know the tool name, try parsing args from the content
  if (toolName) {
    try {
      const parsed = JSON.parse(content);
      return parseWidgetFromToolCall(toolName, parsed);
    } catch {
      // Not JSON — treat as MCP result text
      if (
        toolName.startsWith("mcp_") ||
        toolName.startsWith("call_mcp")
      ) {
        return {
          type: "mcp-result",
          mcp: { toolName, result: content },
        };
      }
    }
  }

  // Try to auto-detect from JSON content
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      if (parsed._widget_type) {
        return parseWidgetFromToolCall(
          parsed._widget_type,
          parsed,
        );
      }
      // A2UI content with components array
      if (parsed.components && parsed.root) {
        return {
          type: "a2ui",
          a2ui: {
            root: parsed.root,
            components: parsed.components,
            data: parsed.data,
          },
        };
      }
    }
  } catch {
    // Not JSON, ignore
  }

  return null;
}

// ── Widget Components ────────────────────────────────────────────────────────

function A2UIInlineWidget({
  data,
}: {
  data: InlineWidgetData;
}) {
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

/** Processes pre-provided A2UI messages and renders the surface. */
function A2UIStreamRenderer({ messages }: { messages: unknown[] }) {
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

function MCPResultWidget({ data }: { data: InlineWidgetData }) {
  const mcp = data.mcp;
  if (!mcp) return null;

  const resultStr =
    typeof mcp.result === "string"
      ? mcp.result
      : JSON.stringify(mcp.result, null, 2);

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
          {mcp.serverName ? ` · ${mcp.serverName}` : ""}
        </span>
        <span className="ml-auto rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-mono text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          {mcp.toolName}
        </span>
      </div>
      <pre className="max-h-64 overflow-auto p-3 text-[11px] leading-relaxed text-gray-700 dark:text-white/70">
        {resultStr}
      </pre>
    </div>
  );
}

function PulseAppWidget({ data }: { data: InlineWidgetData }) {
  const editorContext = useContext(EditorContext);
  const appId = data.pulseApp?.appId;
  const { marketplaceExtensions } = useExtensionAppManager("All");

  const ext = useMemo(
    () => marketplaceExtensions?.find((e) => e.config.id === appId),
    [marketplaceExtensions, appId],
  );

  function openInEditor() {
    if (!appId || !editorContext) return;
    const viewId = createAppViewId(appId);
    const appConfig: AppViewConfig = { viewId, app: appId };
    editorContext.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Editor,
      tabViews: [
        ...prev.tabViews,
        { type: ViewModeEnum.App, config: appConfig },
      ],
      tabIndex: prev.tabViews.length,
    }));
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
      <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
        <Icon
          name="apps"
          variant="round"
          className="text-xs text-amber-600 dark:text-amber-300"
        />
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          Pulse App
        </span>
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 dark:bg-amber-500/15">
          <Icon
            name="apps"
            className="text-lg text-amber-600/70 dark:text-amber-400/70"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-800 dark:text-white/85">
            {ext?.config.displayName ?? appId}
          </p>
          {ext?.config.description && (
            <p className="truncate text-[10px] text-gray-500 dark:text-white/45">
              {ext.config.description}
            </p>
          )}
        </div>
        <button
          onClick={openInEditor}
          className="flex items-center gap-1 rounded-lg border border-amber-300/60 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-500/35 dark:text-amber-300 dark:hover:bg-amber-500/10"
        >
          <Icon name="open_in_new" variant="round" className="text-xs" />
          Open
        </button>
      </div>
    </div>
  );
}

function CanvasWidget({ data }: { data: InlineWidgetData }) {
  const canvasConfig = useMemo<CanvasViewConfig>(
    () => ({
      viewId: createCanvasViewId(),
      appConfigs: [],
    }),
    [],
  );

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
      <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
        <Icon
          name="account_tree"
          variant="round"
          className="text-xs text-amber-600 dark:text-amber-300"
        />
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          Workflow Canvas
        </span>
      </div>
      <div className="h-64">
        <MemoizedCanvasView
          config={canvasConfig}
          isActive={true}
          tabName="Chat Canvas"
        />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function InlineWidget({ data }: { data: InlineWidgetData }) {
  switch (data.type) {
    case "a2ui":
      return <A2UIInlineWidget data={data} />;
    case "mcp-result":
      return <MCPResultWidget data={data} />;
    case "pulse-app":
      return <PulseAppWidget data={data} />;
    case "canvas":
      return <CanvasWidget data={data} />;
    default:
      return null;
  }
}
