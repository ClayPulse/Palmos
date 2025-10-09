import { EditorContext } from "@/components/providers/editor-context-provider";
import { addToast } from "@heroui/react";
import {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useContext, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { AppNodeData, Workflow } from "../types";
import useScopedActions from "./use-scoped-actions";

export default function useCanvasWorkflow(
  canvasId: string,
  initialWorkflow?: Workflow,
) {
  const editorContext = useContext(EditorContext);

  // Throttle for debounced updates.
  // This can limit how often the updates happen to improve performance.
  const throttle =
    1000 / (editorContext?.persistSettings?.canvasUpdatePerSec ?? 60);

  const { runAction } = useScopedActions();

  const [pendingNodes, setPendingNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [entryPoint, setEntryPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(undefined);

  const [localNodes, setLocalNodes] = useNodesState(
    initialWorkflow?.nodes ?? [],
  );
  const [localEdges, setLocalEdges] = useEdgesState(
    initialWorkflow?.edges ?? [],
  );
  const [defaultEntryPoint, setDefaultEntryPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(initialWorkflow?.defaultEntryPoint);

  // Update entry points
  useEffect(() => {
    debouncedGetEntryPoint();
  }, [localNodes]);

  async function startWorkflow() {
    function getExecutionSequence(entryPoint: ReactFlowNode<AppNodeData>) {
      const visited = new Set<string>();
      const sequence: ReactFlowNode<AppNodeData>[] = [];

      function dfs(nodeId: string) {
        // If already visited, return
        if (visited.has(nodeId)) return;

        visited.add(nodeId);
        const node = localNodes.find((n) => n.id === nodeId);

        // If the node is not found, return
        if (!node) return;

        // Add the node to the execution order
        sequence.push(node);
        // Recur for all the nodes connected to this node
        const outgoingEdges = localEdges.filter((e) => e.source === nodeId);
        for (const edge of outgoingEdges) {
          dfs(edge.target);
        }
      }

      dfs(entryPoint.id);
      return sequence;
    }

    function checkNodeAction(sequence: ReactFlowNode<AppNodeData>[]) {
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

    async function runNode(node: ReactFlowNode<AppNodeData>, args: any) {
      const { selectedAction } = node.data as AppNodeData;
      if (!selectedAction) return;
      updateWorkflowNodeData(node.id, { isRunning: true });
      console.log(
        `Running node ${node.id} with action ${selectedAction} and args`,
        args,
      );
      const result = await runAction(
        {
          action: selectedAction,
          viewId: node.id,
          type: "app",
        },
        args,
      );
      updateWorkflowNodeData(node.id, { isRunning: false });

      return result ? JSON.parse(result) : {};
    }

    async function runSequence(sequence: ReactFlowNode<AppNodeData>[]) {
      const resultMap = new Map<string, any>();
      for (const node of sequence) {
        const inputArgs = localEdges
          .filter((e) => e.target === node.id)
          .map((e) => {
            const sourceHandle = e.sourceHandle;
            const targetHandle = e.targetHandle;
            if (!sourceHandle || !targetHandle) return null;

            const sourceResult = resultMap.get(e.source);
            const passedData = sourceResult[sourceHandle];

            return {
              [targetHandle]: passedData,
            };
          })
          .reduce((acc, curr) => {
            if (curr) {
              return { ...acc, ...curr };
            }
            return acc;
          }, {});

        const result = await runNode(node, inputArgs);
        resultMap.set(node.id, result);
      }

      return resultMap;
    }

    console.log("Starting workflow from entry point:", entryPoint);

    if (!entryPoint) {
      addToast({
        title: "No Node Selected",
        description:
          "Please select a node as a entry point to run the workflow.",
        color: "danger",
      });
      return;
    }

    const seq = getExecutionSequence(entryPoint);
    console.log("Execution order:", seq);

    if (!checkNodeAction(seq)) return;

    await runSequence(seq);
  }

  async function pauseWorkflow() {
    setIsPaused(true);
  }

  async function resumeWorkflow() {
    setIsPaused(false);
  }

  async function resetWorkflow() {
    setIsPaused(false);

    if (!entryPoint) {
      addToast({
        title: "No Entry Point Defined",
        description:
          "Please select a node as a entry point or define a default entry point to run the workflow.",
        color: "danger",
      });
      return;
    }
    setPendingNodes([entryPoint]);
  }

  const debouncedGetEntryPoint = useDebouncedCallback(() => {
    const entry = localNodes.find((node) => node.selected) ?? defaultEntryPoint;
    setEntryPoint(entry);
  }, 200);

  const updateWorkflowNodeData = useCallback(
    (nodeViewId: string, data: Partial<AppNodeData>) => {
      if (!canvasId) return;
      setLocalNodes((prev) => {
        const index = prev.findIndex((n) => n.id === nodeViewId);
        if (index === -1) return prev;
        const node = prev[index];
        const newNode = {
          ...node,
          data: {
            ...node.data,
            ...data,
          },
        };
        const newNodes = [...prev];
        newNodes[index] = newNode;
        return newNodes;
      });
    },
    [localNodes],
  );

  const updateWorkflowNodes = useCallback(
    (
      updater: (
        oldNodes: ReactFlowNode<AppNodeData>[],
      ) => ReactFlowNode<AppNodeData>[],
    ) => {
      if (!canvasId) return;
      const updatedNodes = updater(localNodes ?? []);
      setLocalNodes(updatedNodes);
    },
    [canvasId, localNodes],
  );
  const updateWorkflowEdges = useCallback(
    (updater: (oldEdges: ReactFlowEdge[]) => ReactFlowEdge[]) => {
      if (!canvasId) return;
      const updatedEdges = updater(localEdges ?? []);
      setLocalEdges(updatedEdges);
    },
    [canvasId, localEdges],
  );

  const exportWorkflow = useCallback(() => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            nodes: localNodes,
            edges: localEdges,
            defaultEntryPoint: defaultEntryPoint,
          },
          null,
          2,
        ),
      ],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [localNodes, localEdges, defaultEntryPoint]);

  return {
    localNodes,
    localEdges,
    entryPoint,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    updateWorkflowNodes,
    updateWorkflowEdges,
    exportWorkflow,
    updateWorkflowNodeData,
  };
}
