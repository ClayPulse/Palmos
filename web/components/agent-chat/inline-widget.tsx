"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppViewConfig, CanvasViewConfig, InlineWidgetData } from "@/lib/types";
import type {
  A2UIStreamRendererProps,
  InlineWidgetBaseProps,
} from "@/components/agent-chat/types";
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

// Initialize the A2UI component catalog once
initializeDefaultCatalog();

export type { InlineWidgetData };

/**
 * Try to parse an inline widget from an AI tool_call or a ToolMessage content.
 *
 * Tool names the agent can use:
 *  - `render_a2ui`  → A2UI widget
 *  - `mcp_tool_result` → MCP tool output
 *  - `render_pulse_app` → embed a Palmos App
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
      const w = parseWidgetFromToolCall(toolName, parsed);
      if (w) return w;
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
      // Workflow: { name, content } where content is stringified { nodes, edges }
      if (typeof parsed.name === "string" && typeof parsed.content === "string") {
        try {
          const workflow = JSON.parse(parsed.content);
          if (workflow && (workflow.nodes || workflow.edges)) {
            return {
              type: "canvas",
              canvas: {
                name: parsed.name,
                nodes: workflow.nodes,
                edges: workflow.edges,
              },
            };
          }
        } catch {
          // content wasn't valid JSON, ignore
        }
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
}: InlineWidgetBaseProps) {
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

function MCPResultWidget({ data }: InlineWidgetBaseProps) {
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

function PulseAppWidget({ data }: InlineWidgetBaseProps) {
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
          Palmos App
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

function CanvasWidget({ data }: InlineWidgetBaseProps) {
  const editorContext = useContext(EditorContext);
  const { createCanvasTabView } = useTabViewManager();

  const workflowContent = useMemo(
    () => ({
      nodes: (data.canvas?.nodes ?? []) as any[],
      edges: (data.canvas?.edges ?? []) as any[],
    }),
    [data.canvas],
  );

  function openInNewTab() {
    createCanvasTabView({
      viewId: createCanvasViewId(),
      initialWorkflowContent: workflowContent,
    });
  }

  function applyToActiveTab() {
    const tabViews = editorContext?.editorStates.tabViews;
    const tabIndex = editorContext?.editorStates.tabIndex ?? 0;
    const activeTab = tabViews?.[tabIndex];

    if (activeTab?.type === ViewModeEnum.Canvas) {
      const config = activeTab.config as CanvasViewConfig;
      config.initialWorkflowContent = workflowContent;
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        tabViews: [...prev.tabViews],
      }));
    } else {
      openInNewTab();
    }
  }

  return (
    <div className="my-2 flex items-center gap-2.5 rounded-xl border border-amber-200/60 bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/6">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
        <Icon name="account_tree" variant="round" className="text-base text-amber-600 dark:text-amber-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-default-700 dark:text-white/85">
          Your workflow is ready.
        </p>
        {data.canvas?.name && (
          <p className="text-[10px] text-default-400 dark:text-white/50">
            {data.canvas.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={applyToActiveTab}
          className="flex items-center gap-1.5 rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-default-600 transition-colors hover:border-default-300 hover:bg-default-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10"
        >
          Preview
        </button>
        <button
          onClick={applyToActiveTab}
          className="flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/20"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function InlineWidget({ data }: InlineWidgetBaseProps) {
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
