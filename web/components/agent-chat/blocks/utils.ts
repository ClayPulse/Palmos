import type { ChatBlockData } from "@/lib/types";
import type { ComponentInstance } from "@a2ui/react";

/**
 * Try to parse an inline widget from an AI tool_call or a ToolMessage content.
 *
 * Tool names the agent can use:
 *  - `render_a2ui`  → A2UI widget
 *  - `mcp_tool_result` → MCP tool output
 *  - `render_pulse_app` → embed a Palmos App
 *  - `render_canvas` → workflow canvas snippet
 *  - `draft_diagram` → mermaid diagram
 */
export function parseWidgetFromToolCall(
  toolName: string,
  args: Record<string, unknown>,
): ChatBlockData | null {
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

    case "draft_diagram":
    case "render_diagram":
    case "show_diagram": {
      const code =
        (args.diagramCode ?? args.code ?? args.diagram) as string | undefined;
      if (!code) return null;
      return {
        type: "diagram",
        diagram: {
          code,
          title: args.title as string | undefined,
          diagramType: (args.diagramType ?? args.diagram_type) as
            | string
            | undefined,
        },
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
): ChatBlockData | null {
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
