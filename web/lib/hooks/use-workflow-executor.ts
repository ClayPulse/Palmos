import { addToast } from "@heroui/react";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { useState } from "react";
import { AppNodeData } from "../types";
import useActionExecutor from "./use-action-executor";

export default function useWorkflowExecutor({
  localNodes,
  localEdges,
  entryPoint,
  updateWorkflowNodeData,
  updateEdgeData,
}: {
  localNodes: ReactFlowNode<AppNodeData>[];
  localEdges: ReactFlowEdge[];
  entryPoint: ReactFlowNode<AppNodeData> | undefined;
  updateWorkflowNodeData: (
    nodeViewId: string,
    data: Partial<AppNodeData>,
  ) => void;
  updateEdgeData: (edgeId: string, data: Record<string, any>) => void;
}) {
  const { runScopedAction } = useActionExecutor();

  const [pendingNodes, setPendingNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // DAG traversal using Kahn's algorithm (topological sort)
  function getExecutionSequence(
    entryPoint: ReactFlowNode<AppNodeData>,
  ): ReactFlowNode<AppNodeData>[] {
    // 1. Build forward and reverse adjacency lists
    const adj: Record<string, string[]> = {};
    const radj: Record<string, string[]> = {};
    for (const node of localNodes) {
      adj[node.id] = [];
      radj[node.id] = [];
    }
    for (const edge of localEdges) {
      if (adj[edge.source]) adj[edge.source].push(edge.target);
      if (radj[edge.target]) radj[edge.target].push(edge.source);
    }

    // 2. Walk forward from entryPoint to find all downstream nodes
    const downstream = new Set<string>();
    function markDownstream(nodeId: string) {
      if (downstream.has(nodeId)) return;
      downstream.add(nodeId);
      for (const neighbor of adj[nodeId] || []) markDownstream(neighbor);
    }
    markDownstream(entryPoint.id);

    // 3. For every downstream node, walk backward to pull in upstream dependencies
    const reachable = new Set<string>();
    function markUpstream(nodeId: string) {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);
      for (const parent of radj[nodeId] || []) markUpstream(parent);
    }
    for (const nodeId of downstream) markUpstream(nodeId);

    // 4. Build inDegree only within the reachable subgraph
    const inDegree: Record<string, number> = {};
    for (const nodeId of reachable) inDegree[nodeId] = 0;
    for (const edge of localEdges) {
      if (reachable.has(edge.source) && reachable.has(edge.target)) {
        inDegree[edge.target]++;
      }
    }

    // 5. Kahn's algorithm over the reachable subgraph
    const queue: string[] = [];
    for (const nodeId of reachable) {
      if (inDegree[nodeId] === 0) queue.push(nodeId);
    }

    const sequence: ReactFlowNode<AppNodeData>[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = localNodes.find((n) => n.id === nodeId);
      if (node) sequence.push(node);
      for (const neighbor of adj[nodeId] || []) {
        if (!reachable.has(neighbor)) continue;
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      }
    }

    // 6. Cycle detection
    if (sequence.length < reachable.size) {
      addToast({
        title: "Cycle Detected in Workflow",
        description:
          "A cycle was detected in the workflow graph. Please remove cycles to ensure correct execution.",
        color: "danger",
      });
      throw new Error("Cycle detected in workflow graph");
    }

    return sequence;
  }

  function checkNodeAction(sequence: ReactFlowNode<AppNodeData>[]): boolean {
    let passed = true;
    for (const node of sequence) {
      const { selectedAction } = node.data as AppNodeData;
      if (!selectedAction) {
        addToast({
          title: "No Action Selected",
          description: `Please select an action for the node "${node.data.config.app}" to run.`,
          color: "danger",
        });
        passed = false;
      }
    }
    return passed;
  }

  async function runNode(
    node: ReactFlowNode<AppNodeData>,
    args: any,
  ): Promise<Record<string, any>> {
    const { selectedAction } = node.data as AppNodeData;
    if (!selectedAction) return {};
    updateWorkflowNodeData(node.id, { isRunning: true });
    const result = await runScopedAction(
      {
        action: selectedAction,
        viewId: node.id,
        type: "app",
      },
      args,
    );
    updateWorkflowNodeData(node.id, { isRunning: false });
    return result ?? {};
  }

  async function runSequence(
    sequence: ReactFlowNode<AppNodeData>[],
  ): Promise<Map<string, any>> {
    // Helper to get input args for a node from upstream edge results
    function getInputArgs(
      node: ReactFlowNode<AppNodeData>,
      resultMap: Map<string, any>,
    ) {
      const edgeArgs = localEdges
        .filter((e) => e.target === node.id)
        .map((e) => {
          const sourceHandle = e.sourceHandle;
          const targetHandle = e.targetHandle;
          if (!sourceHandle || !targetHandle) return null;
          const sourceResult = resultMap.get(e.source);
          const passedData = sourceResult
            ? sourceResult[sourceHandle]
            : undefined;
          return { [targetHandle]: passedData };
        })
        .reduce<Record<string, any>>((acc, curr) => {
          return curr ? { ...acc, ...curr } : acc;
        }, {});

      return {
        ...edgeArgs,
        ...node.data.ownedAppViews,
      };
    }

    // Parallel execution using in-degree tracking
    const resultMap = new Map<string, any>();
    const inDegree: Record<string, number> = {};
    // blockedCount tracks how many incoming edges were skipped (failed if-condition)
    const blockedCount: Record<string, number> = {};
    // outEdgesMap stores outgoing edges per node (replacing the children id-list)
    const outEdgesMap: Record<string, ReactFlowEdge[]> = {};

    for (const node of sequence) {
      inDegree[node.id] = 0;
      blockedCount[node.id] = 0;
      outEdgesMap[node.id] = [];
    }
    for (const edge of localEdges) {
      if (
        inDegree[edge.target] !== undefined &&
        inDegree[edge.source] !== undefined
      ) {
        inDegree[edge.target]++;
        outEdgesMap[edge.source].push(edge);
      }
    }

    // Flush nodes whose every remaining incoming edge has been blocked by a
    // failed if-condition. Those nodes are skipped (result = {}) and their
    // outgoing edges are propagated so downstream nodes can still become ready.
    function flushBlocked() {
      let changed = true;
      while (changed) {
        changed = false;
        for (const nodeId of Object.keys(inDegree)) {
          if (resultMap.has(nodeId)) continue;
          if (
            inDegree[nodeId] > 0 &&
            inDegree[nodeId] === blockedCount[nodeId]
          ) {
            resultMap.set(nodeId, {});
            completedCount++;
            for (const edge of outEdgesMap[nodeId]) {
              inDegree[edge.target]--;
            }
            changed = true;
          }
        }
      }
    }

    let ready = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
    const running = new Set<string>();
    let completedCount = 0;
    const totalNodes = sequence.length;

    return new Promise<Map<string, any>>((resolve, reject) => {
      async function processReady() {
        if (ready.length === 0 && completedCount === totalNodes) {
          resolve(resultMap);
          return;
        }
        const promises = ready.map(async (nodeId) => {
          running.add(nodeId);
          const node = sequence.find((n) => n.id === nodeId);
          if (!node) return;
          const inputArgs = getInputArgs(node, resultMap);
          const result = await runNode(node, inputArgs);
          resultMap.set(nodeId, result);
          completedCount++;
          running.delete(nodeId);

          // Process outgoing edges with if/forEach awareness
          for (const edge of outEdgesMap[nodeId] || []) {
            const flowType = (edge.data as any)?.flowType as
              | "if"
              | "forEach"
              | undefined;

            if (flowType === "if") {
              const val = result[edge.sourceHandle ?? ""];
              const conditionExpected =
                (edge.data as any)?.condition ?? true;
              const condMet = Boolean(val) === conditionExpected;
              if (!condMet) {
                blockedCount[edge.target]++;
                continue; // don't decrement in-degree — edge is blocked
              }
              inDegree[edge.target]--;
              continue;
            }

            if (flowType === "forEach") {
              const items: any[] = Array.isArray(
                result[edge.sourceHandle ?? ""],
              )
                ? result[edge.sourceHandle ?? ""]
                : [];

              // Collect all nodes in the forEach scope (target + downstream)
              const scopeIds = new Set<string>();
              const scopeQueue = [edge.target];
              while (scopeQueue.length > 0) {
                const nid = scopeQueue.shift()!;
                if (scopeIds.has(nid)) continue;
                scopeIds.add(nid);
                for (const childEdge of outEdgesMap[nid] || []) {
                  scopeQueue.push(childEdge.target);
                }
              }

              const scopeNodes = sequence.filter((n) => scopeIds.has(n.id));
              const scopeEdges = localEdges.filter(
                (e) => scopeIds.has(e.source) && scopeIds.has(e.target),
              );




              // Build topological order for the scope subgraph
              const scopeInDeg: Record<string, number> = {};
              for (const nid of scopeIds) scopeInDeg[nid] = 0;
              for (const e of scopeEdges) scopeInDeg[e.target]++;
              const scopeAdj: Record<string, string[]> = {};
              for (const nid of scopeIds) scopeAdj[nid] = [];
              for (const e of scopeEdges) scopeAdj[e.source].push(e.target);
              const topoQueue: string[] = [];
              for (const nid of scopeIds) {
                if (scopeInDeg[nid] === 0) topoQueue.push(nid);
              }
              const scopeSequence: ReactFlowNode<AppNodeData>[] = [];
              while (topoQueue.length > 0) {
                const nid = topoQueue.shift()!;
                const node = scopeNodes.find((n) => n.id === nid);
                if (node) scopeSequence.push(node);
                for (const child of scopeAdj[nid] || []) {
                  scopeInDeg[child]--;
                  if (scopeInDeg[child] === 0) topoQueue.push(child);
                }
              }

              // Run all iterations on the original scope nodes (no clones)
              const iterResults: Record<string, Record<string, any>>[] = [];

              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const iterResultMap = new Map<string, any>();

                for (const scopeNode of scopeSequence) {
                  let inputArgs: Record<string, any>;
                  if (scopeNode.id === edge.target) {
                    inputArgs = {
                      [edge.targetHandle ?? ""]: item,
                      ...scopeNode.data.ownedAppViews,
                    };
                  } else {
                    inputArgs = {};
                    for (const e of scopeEdges) {
                      if (e.target !== scopeNode.id) continue;
                      if (!e.sourceHandle || !e.targetHandle) continue;
                      const srcResult = iterResultMap.get(e.source);
                      if (srcResult) {
                        inputArgs[e.targetHandle] =
                          srcResult[e.sourceHandle];
                      }
                    }
                    inputArgs = {
                      ...inputArgs,
                      ...scopeNode.data.ownedAppViews,
                    };
                  }
                  const nodeResult = await runNode(scopeNode, inputArgs);
                  iterResultMap.set(scopeNode.id, nodeResult);
                }

                const iterRecord: Record<string, Record<string, any>> = {};
                for (const [nid, res] of iterResultMap) {
                  iterRecord[nid] = res;
                }
                iterResults.push(iterRecord);
              }

              // Mark all original scope nodes as completed
              for (const nid of scopeIds) {
                if (!resultMap.has(nid)) {
                  resultMap.set(
                    nid,
                    iterResults[iterResults.length - 1]?.[nid] ?? {},
                  );
                  completedCount++;
                }
              }

              updateEdgeData(edge.id, {
                iterationResults: iterResults,
              });

              // Propagate edges leaving the scope
              for (const scopeNid of scopeIds) {
                for (const childEdge of outEdgesMap[scopeNid] || []) {
                  if (!scopeIds.has(childEdge.target)) {
                    inDegree[childEdge.target]--;
                  }
                }
              }

              // Consume the forEach edge itself
              inDegree[edge.target]--;
              continue;
            }

            // Default edge
            inDegree[edge.target]--;
          }

          flushBlocked();
        });
        ready = [];
        await Promise.all(promises);
        // Find new ready nodes
        for (const nodeId of Object.keys(inDegree)) {
          if (
            inDegree[nodeId] === 0 &&
            !running.has(nodeId) &&
            !resultMap.has(nodeId)
          ) {
            ready.push(nodeId);
          }
        }
        if (ready.length > 0) {
          await processReady();
        } else if (completedCount === totalNodes) {
          resolve(resultMap);
        }
      }
      processReady();
    });
  }

  // Forward-only execution sequence: walk downstream from the given node
  // without tracing back upstream dependencies. The starting node's incoming
  // edges are ignored so it runs with whatever inputs it already has.
  function getForwardExecutionSequence(
    startNode: ReactFlowNode<AppNodeData>,
  ): ReactFlowNode<AppNodeData>[] {
    // Build forward adjacency list
    const adj: Record<string, string[]> = {};
    for (const node of localNodes) {
      adj[node.id] = [];
    }
    for (const edge of localEdges) {
      if (adj[edge.source]) adj[edge.source].push(edge.target);
    }

    // Walk forward from startNode to find all downstream nodes
    const reachable = new Set<string>();
    function walk(nodeId: string) {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);
      for (const neighbor of adj[nodeId] || []) walk(neighbor);
    }
    walk(startNode.id);

    // Build in-degree only within the reachable subgraph, ignoring edges
    // that come from outside the subgraph (i.e. upstream of startNode)
    const inDegree: Record<string, number> = {};
    for (const nodeId of reachable) inDegree[nodeId] = 0;
    for (const edge of localEdges) {
      if (reachable.has(edge.source) && reachable.has(edge.target)) {
        inDegree[edge.target]++;
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const nodeId of reachable) {
      if (inDegree[nodeId] === 0) queue.push(nodeId);
    }

    const sequence: ReactFlowNode<AppNodeData>[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = localNodes.find((n) => n.id === nodeId);
      if (node) sequence.push(node);
      for (const neighbor of adj[nodeId] || []) {
        if (!reachable.has(neighbor)) continue;
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      }
    }

    if (sequence.length < reachable.size) {
      addToast({
        title: "Cycle Detected in Workflow",
        description:
          "A cycle was detected in the workflow graph. Please remove cycles to ensure correct execution.",
        color: "danger",
      });
      throw new Error("Cycle detected in workflow graph");
    }

    return sequence;
  }

  async function startWorkflow() {
    console.log("Starting workflow from entry point:", entryPoint);
    if (!entryPoint) {
      addToast({
        title: "No Node Selected",
        description:
          "Please select a node as an entry point to run the workflow.",
        color: "danger",
      });
      return;
    }
    try {
      const seq = getExecutionSequence(entryPoint);
      console.log("Execution order:", seq);
      if (!checkNodeAction(seq)) return;
      await runSequence(seq);
    } catch (error) {
      console.error("Failed to start workflow:", error);
      addToast({
        title: "Failed to Start Workflow",
        description: (error as Error).message,
        color: "danger",
      });
    }
  }

  async function startWorkflowFromNode() {
    if (!entryPoint) {
      addToast({
        title: "No Node Selected",
        description: "Please select a node to run from.",
        color: "danger",
      });
      return;
    }
    try {
      const seq = getForwardExecutionSequence(entryPoint);
      console.log("Execution order (from selected):", seq);
      if (!checkNodeAction(seq)) return;
      await runSequence(seq);
    } catch (error) {
      console.error("Failed to start workflow from node:", error);
      addToast({
        title: "Failed to Start Workflow",
        description: (error as Error).message,
        color: "danger",
      });
    }
  }

  // TODO: Implement pause functionality by keeping track of running nodes and preventing new nodes from starting until resumed
  async function pauseWorkflow() {
    setIsPaused(true);
  }

  // TODO: Implement resume and reset functionality
  async function resumeWorkflow() {
    setIsPaused(false);
  }

  // TODO: Implement reset functionality by clearing any running state and allowing the workflow to be started again from the entry point
  async function resetWorkflow() {
    setIsPaused(false);

    if (!entryPoint) {
      addToast({
        title: "No Entry Point Defined",
        description:
          "Please select a node as an entry point or define a default entry point to run the workflow.",
        color: "danger",
      });
      return;
    }
    setPendingNodes([entryPoint]);
  }

  return {
    startWorkflow,
    startWorkflowFromNode,
    pauseWorkflow,
    resumeWorkflow,
    resetWorkflow,
    isPaused,
    pendingNodes,
  };
}
