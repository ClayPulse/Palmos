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
}: {
  localNodes: ReactFlowNode<AppNodeData>[];
  localEdges: ReactFlowEdge[];
  entryPoint: ReactFlowNode<AppNodeData> | undefined;
  updateWorkflowNodeData: (
    nodeViewId: string,
    data: Partial<AppNodeData>,
  ) => void;
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
    // 1. Build adjacency list
    const adj: Record<string, string[]> = {};
    for (const node of localNodes) adj[node.id] = [];
    for (const edge of localEdges) {
      if (adj[edge.source]) adj[edge.source].push(edge.target);
    }

    // 2. Mark reachable nodes from entryPoint
    const reachable = new Set<string>();
    function markReachable(nodeId: string) {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);
      for (const neighbor of adj[nodeId] || []) markReachable(neighbor);
    }
    markReachable(entryPoint.id);

    // 3. Build inDegree only within the reachable subgraph
    const inDegree: Record<string, number> = {};
    for (const nodeId of reachable) inDegree[nodeId] = 0;
    for (const edge of localEdges) {
      if (reachable.has(edge.source) && reachable.has(edge.target)) {
        inDegree[edge.target]++;
      }
    }

    // 4. Kahn's algorithm over the reachable subgraph
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

    // 5. Cycle detection
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
    // Helper to get input args for a node
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
    const children: Record<string, string[]> = {};
    for (const node of sequence) {
      inDegree[node.id] = 0;
      children[node.id] = [];
    }
    for (const edge of localEdges) {
      if (
        inDegree[edge.target] !== undefined &&
        inDegree[edge.source] !== undefined
      ) {
        inDegree[edge.target]++;
        children[edge.source].push(edge.target);
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
          for (const childId of children[nodeId] || []) {
            inDegree[childId]--;
          }
          completedCount++;
          running.delete(nodeId);
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
    pauseWorkflow,
    resumeWorkflow,
    resetWorkflow,
    isPaused,
    pendingNodes,
  };
}
