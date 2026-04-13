/**
 * Converter from the "simplified" authoring format (flat DAG with explicit
 * I/O piping — see type declarations below) into the ReactFlow-compatible
 * `WorkflowContent` used by the canvas.
 *
 * The simplified format is what a coding agent writes by hand; this module
 * compiles it down to the runner-ready shape (nodes with synthesized
 * `selectedAction`, edges with proper `sourceHandle`/`targetHandle`, and a
 * simple layered layout).
 */

import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import type { Action, TypedVariable, TypedVariableType } from "@pulse-editor/shared-utils";
import type { AppNodeData, AppViewConfig, WorkflowContent } from "@/lib/types";
import type { WorkflowEdgeData } from "@/components/views/editor/canvas/edges/workflow-edge";

// #region Simplified DAG types

export interface SimplifiedAppRef {
  appId: string;
  version: string;
}

export interface SimplifiedNextLink {
  to: string;
  pipe?: Record<string, string>;
  flow?: "default" | "if" | "forEach";
  gate?: string;
  condition?: boolean | string | number;
}

export interface SimplifiedWorkflowNode {
  id: string;
  app: SimplifiedAppRef;
  action: string;
  inputs?: Record<string, string>;
  outputs?: Record<string, string>;
  args?: Record<string, unknown>;
  next?: SimplifiedNextLink[];
}

export interface SimplifiedWorkflowDAG {
  name: string;
  version: string;
  description?: string;
  entry: string;
  /** Node ID whose output is the workflow's return value. */
  exit?: string;
  nodes: SimplifiedWorkflowNode[];
  /** Environment variables required by this workflow. Keys are var names, values are descriptions. */
  env?: Record<string, string>;
}

// #endregion

/**
 * Heuristic: a parsed JSON doc looks like a simplified workflow DAG when it
 * has an `entry` string and a `nodes` array whose first item carries an
 * `app.appId` + `action` pair (the fields that only exist in the simplified
 * schema; the full ReactFlow format uses `data.config` on each node).
 */
export function isSimplifiedWorkflow(
  doc: unknown,
): doc is SimplifiedWorkflowDAG {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  if (typeof d.entry !== "string") return false;
  if (!Array.isArray(d.nodes) || d.nodes.length === 0) return false;
  const first = d.nodes[0] as Record<string, unknown> | undefined;
  if (!first || typeof first !== "object") return false;
  const app = first.app as Record<string, unknown> | undefined;
  return (
    typeof first.id === "string" &&
    typeof first.action === "string" &&
    !!app &&
    typeof app.appId === "string"
  );
}

/** Parse a hint like "string", "number", "string[]", "object" → TypedVariableType. */
function parseTypeHint(hint: string | undefined): TypedVariableType {
  if (!hint) return "string";
  const trimmed = hint.trim();
  if (trimmed.endsWith("[]")) {
    const inner = parseTypeHint(trimmed.slice(0, -2));
    return [inner] as TypedVariableType;
  }
  switch (trimmed) {
    case "string":
    case "number":
    case "boolean":
    case "object":
    case "app-instance":
      return trimmed;
    default:
      return trimmed; // pass-through; TypedVariableType allows arbitrary strings
  }
}

function toTypedVarMap(
  hints: Record<string, string> | undefined,
): Record<string, TypedVariable> {
  const out: Record<string, TypedVariable> = {};
  if (!hints) return out;
  for (const [key, hint] of Object.entries(hints)) {
    out[key] = {
      type: parseTypeHint(hint),
      description: "",
    };
  }
  return out;
}

/**
 * Synthesize an Action object from the simplified node's `inputs`/`outputs`
 * hints. This is what the canvas uses to render input/output handles — without
 * it, the edges we emit would be pruned by the handle-validation pass in
 * `use-canvas-workflow`.
 */
function synthesizeAction(node: SimplifiedWorkflowNode): Action {
  return {
    name: node.action,
    description: "",
    parameters: toTypedVarMap(node.inputs),
    returns: toTypedVarMap(node.outputs),
  };
}

function randomSuffix(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * BFS layered layout from the entry node. Unreachable nodes are dropped into
 * a final row so the user can still see and re-wire them.
 */
function layoutNodes(
  nodes: SimplifiedWorkflowNode[],
  entryId: string,
): Record<string, { x: number; y: number }> {
  const COL_W = 360;
  const ROW_H = 420;
  const positions: Record<string, { x: number; y: number }> = {};
  const depth: Record<string, number> = {};
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // BFS to assign depths
  const queue: string[] = [];
  if (byId.has(entryId)) {
    depth[entryId] = 0;
    queue.push(entryId);
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = byId.get(id);
    if (!node?.next) continue;
    for (const link of node.next) {
      const childDepth = (depth[id] ?? 0) + 1;
      if (depth[link.to] === undefined || depth[link.to] < childDepth) {
        depth[link.to] = childDepth;
        queue.push(link.to);
      }
    }
  }

  // Any unreachable nodes go below the deepest reached row
  const maxDepth = Object.values(depth).reduce((m, d) => Math.max(m, d), 0);
  for (const n of nodes) {
    if (depth[n.id] === undefined) depth[n.id] = maxDepth + 1;
  }

  // Group by depth, assign column index within the row
  const rows = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth[n.id];
    if (!rows.has(d)) rows.set(d, []);
    rows.get(d)!.push(n.id);
  }
  for (const [d, ids] of rows.entries()) {
    ids.forEach((id, i) => {
      positions[id] = { x: i * COL_W, y: d * ROW_H };
    });
  }
  return positions;
}

/**
 * Convert a simplified workflow DAG into ReactFlow-compatible WorkflowContent.
 *
 * Per simplified-format spec, each `pipe` entry is `{ childInput: thisOutput }`.
 * We emit one ReactFlow edge per pipe entry so the canvas can render the
 * source/target handles correctly. Empty pipes become a single control edge
 * with no handles (still valid — kept by the handle-validation pass).
 */
export function convertSimplifiedToWorkflowContent(
  dag: SimplifiedWorkflowDAG,
): WorkflowContent {
  const positions = layoutNodes(dag.nodes, dag.entry);

  const rfNodes: ReactFlowNode<AppNodeData>[] = dag.nodes.map((n) => {
    const config: AppViewConfig = {
      viewId: n.id,
      app: n.app.appId,
      requiredVersion: n.app.version,
      initialWidth: 640,
      initialHeight: 360,
    };

    // Encode static args as a note so the author can see them after import.
    // (The canvas has no generic "args prefill" channel today — this keeps
    // the information visible rather than silently dropping it.)
    const note =
      n.args && Object.keys(n.args).length > 0
        ? `args: ${JSON.stringify(n.args, null, 2)}`
        : undefined;

    const data: AppNodeData = {
      config,
      selectedAction: synthesizeAction(n),
      isRunning: false,
      isShowingWorkflowConnector: true,
      ownedAppViews: {},
      isFullscreen: false,
      note,
      isDefaultEntry: n.id === dag.entry ? true : undefined,
      isDefaultExit: dag.exit && n.id === dag.exit ? true : undefined,
    };

    return {
      id: n.id,
      type: "appNode",
      position: positions[n.id] ?? { x: 0, y: 0 },
      width: 640,
      height: 360,
      data,
    };
  });

  const rfEdges: ReactFlowEdge[] = [];
  for (const n of dag.nodes) {
    if (!n.next) continue;
    for (const link of n.next) {
      const edgeData: WorkflowEdgeData | undefined =
        link.flow === "if"
          ? {
              flowType: "if",
              condition:
                typeof link.condition === "boolean" ? link.condition : true,
            }
          : link.flow === "forEach"
            ? { flowType: "forEach" }
            : undefined;

      const pipeEntries = Object.entries(link.pipe ?? {});

      if (pipeEntries.length === 0) {
        // Control-only edge. If a gate is specified (forEach/if), use it as
        // the source handle so the canvas can still highlight the right
        // output port.
        rfEdges.push({
          id: `${n.id}-${link.to}-${randomSuffix()}`,
          source: n.id,
          target: link.to,
          sourceHandle: link.gate,
          type: "workflowEdge",
          data: edgeData,
        });
        continue;
      }

      for (const [childInput, thisOutput] of pipeEntries) {
        rfEdges.push({
          id: `${n.id}-${link.to}-${childInput}-${randomSuffix()}`,
          source: n.id,
          target: link.to,
          sourceHandle: thisOutput,
          targetHandle: childInput,
          type: "workflowEdge",
          data: edgeData,
        });
      }
    }
  }

  // Carry over env declarations as requiredEnvs
  const requiredEnvs = dag.env
    ? Object.entries(dag.env).map(([key, description]) => ({ key, description }))
    : undefined;

  return { nodes: rfNodes, edges: rfEdges, ...(requiredEnvs && { requiredEnvs }) };
}
