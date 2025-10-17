import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import { addToast } from "@heroui/react";
import { IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useContext, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { AppNodeData, WorkflowContent } from "../types";
import useScopedActions from "./use-scoped-actions";

export default function useCanvasWorkflow(
  initialWorkflowContent?: WorkflowContent,
) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const { runScopedAction } = useScopedActions();

  const [pendingNodes, setPendingNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [entryPoint, setEntryPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(undefined);

  const [localNodes, setLocalNodes] = useNodesState(
    initialWorkflowContent?.nodes ?? [],
  );
  const [localEdges, setLocalEdges] = useEdgesState(
    initialWorkflowContent?.edges ?? [],
  );
  const [defaultEntryPoint, setDefaultEntryPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(initialWorkflowContent?.defaultEntryPoint);

  const [isRestored, setIsRestored] = useState(false);

  const debouncedGetEntryPoint = useDebouncedCallback(() => {
    const entry = localNodes.find((node) => node.selected) ?? defaultEntryPoint;
    setEntryPoint(entry);
  }, 200);

  const debounceSetSelectedViews = useDebouncedCallback(() => {
    const viewIds = localNodes
      .filter((n) => n.selected)
      .map((n) => n.data.config.viewId);

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      selectedViewIds: viewIds,
    }));
  }, 200);

  const updateWorkflowNodeData = useCallback(
    (nodeViewId: string, data: Partial<AppNodeData>) => {
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
      const updatedNodes = updater(localNodes ?? []);
      setLocalNodes(updatedNodes);
    },
    [localNodes],
  );
  const updateWorkflowEdges = useCallback(
    (updater: (oldEdges: ReactFlowEdge[]) => ReactFlowEdge[]) => {
      const updatedEdges = updater(localEdges ?? []);
      setLocalEdges(updatedEdges);
    },
    [localEdges],
  );

  const exportWorkflow = useCallback(async () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            nodes: localNodes,
            edges: localEdges,
            defaultEntryPoint: defaultEntryPoint,
            snapshotStates: await saveAppsSnapshotStates(),
          } as WorkflowContent,
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

  // Update entry points
  useEffect(() => {
    debouncedGetEntryPoint();
    debounceSetSelectedViews();
  }, [localNodes]);

  // Restore snapshot states upon loading a workflow
  useEffect(() => {
    async function restore() {
      if (!imcContext) return;
      else if (isRestored) return;
      else if (!initialWorkflowContent) return;
      setIsRestored(true);

      if (initialWorkflowContent.snapshotStates) {
        await restoreAppsSnapshotStates(initialWorkflowContent);
      }
    }

    restore();
  }, [initialWorkflowContent, imcContext, isRestored]);

  async function startWorkflow() {
    // DAG traversal using Kahn's algorithm (topological sort)
    function getExecutionSequence(entryPoint: ReactFlowNode<AppNodeData>) {
      // Build adjacency list and in-degree map
      const adj: Record<string, string[]> = {};
      const inDegree: Record<string, number> = {};
      for (const node of localNodes) {
        adj[node.id] = [];
        inDegree[node.id] = 0;
      }
      for (const edge of localEdges) {
        if (adj[edge.source]) {
          adj[edge.source].push(edge.target);
        }
        if (inDegree[edge.target] !== undefined) {
          inDegree[edge.target]++;
        }
      }

      // Find all nodes reachable from entryPoint
      const reachable = new Set<string>();
      function markReachable(nodeId: string) {
        if (reachable.has(nodeId)) return;
        reachable.add(nodeId);
        for (const neighbor of adj[nodeId] || []) {
          markReachable(neighbor);
        }
      }
      markReachable(entryPoint.id);

      // Kahn's algorithm: only process reachable nodes
      const queue: string[] = [];
      for (const nodeId of Object.keys(inDegree)) {
        if (inDegree[nodeId] === 0 && reachable.has(nodeId)) {
          queue.push(nodeId);
        }
      }
      const sequence: ReactFlowNode<AppNodeData>[] = [];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const nodeId = queue.shift();
        if (!nodeId) continue;
        if (!reachable.has(nodeId) || visited.has(nodeId)) continue;
        visited.add(nodeId);
        const node = localNodes.find((n) => n.id === nodeId);
        if (node) {
          sequence.push(node);
        }
        for (const neighbor of adj[nodeId] || []) {
          if (!reachable.has(neighbor)) continue;
          inDegree[neighbor]--;
          if (inDegree[neighbor] === 0) {
            queue.push(neighbor);
          }
        }
      }
      // Cycle detection: if not all reachable nodes are in sequence, there is a cycle
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
        `Running node ${node.id} with action \n${JSON.stringify(selectedAction)} \nand args \n${JSON.stringify(args)}`,
      );
      const result = await runScopedAction(
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
      // Helper to get input args for a node
      function getInputArgs(node: ReactFlowNode<AppNodeData>) {
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

        const appInstanceArgs = node.data.ownedApps;

        return {
          ...edgeArgs,
          ...appInstanceArgs,
        };
      }

      // Parallel execution using in-degree tracking
      const resultMap = new Map<string, any>();
      // Build in-degree and children map for reachable nodes
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

      // Set of node ids ready to run (in-degree 0)
      let ready = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
      const running = new Set<string>();

      // Track how many nodes have completed
      let completedCount = 0;
      const totalNodes = sequence.length;

      return new Promise<Map<string, any>>(async (resolve, reject) => {
        async function processReady() {
          if (ready.length === 0 && completedCount === totalNodes) {
            resolve(resultMap);
            return;
          }
          // Run all ready nodes in parallel
          const promises = ready.map(async (nodeId) => {
            running.add(nodeId);
            const node = sequence.find((n) => n.id === nodeId);
            if (!node) return;
            const inputArgs = getInputArgs(node);
            const result = await runNode(node, inputArgs);
            resultMap.set(nodeId, result);
            // After running, update children
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

    // Start the workflow
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

  async function saveAppsSnapshotStates() {
    const apps = localNodes.map((node) => node.data.config);

    const appStates = await Promise.all(
      apps.map(async (app) => {
        if (!app.viewId) return null;

        // Do a time out because the app may not use snapshot feature
        return await Promise.race([
          new Promise<any>((resolve) => setTimeout(() => resolve(null), 2000)),
          (async () => {
            // All IMC channels' states
            const channelsStates = await imcContext?.polyIMC?.sendMessage(
              app.viewId,
              IMCMessageTypeEnum.EditorAppStateSnapshotSave,
            );

            // Consolidate states from all channels into one for this view ID
            const states = channelsStates?.reduce((acc, curr) => {
              return { ...acc, ...curr };
            }, {});

            return { appId: app.viewId, states: states };
          })(),
        ]);
      }),
    );

    const appStatesMap = appStates
      .filter((s) => s && s.states)
      .reduce(
        (acc, curr) => {
          if (curr) {
            acc[curr.appId] = curr.states;
          }
          return acc;
        },
        {} as { [key: string]: any },
      );

    return appStatesMap;
  }

  async function restoreAppsSnapshotStates(content: WorkflowContent) {
    if (!imcContext || !imcContext.polyIMC) {
      console.error("IMC context not available for restoring snapshot states");
      return;
    } else if (!content.snapshotStates) return;

    const apps = content.nodes.map((node) => node.data.config);
    for (const app of apps) {
      if (!app.viewId) continue;
      if (content.snapshotStates[app.viewId]) {
        // Wait until the view is initialized
        await imcContext.resolveWhenViewInitialized(app.viewId);
        // Send snapshot restore message
        await imcContext.polyIMC.sendMessage(
          app.viewId,
          IMCMessageTypeEnum.EditorAppStateSnapshotRestore,
          { states: content.snapshotStates[app.viewId] },
        );
      }
    }
  }

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
    saveAppsSnapshotStates,
    restoreAppsSnapshotStates,
  };
}
