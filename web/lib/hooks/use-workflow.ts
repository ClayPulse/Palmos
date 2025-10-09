import { EditorContext } from "@/components/providers/editor-context-provider";
import { addToast } from "@heroui/react";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { useCallback, useContext, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { AppNodeData, Workflow } from "../types";
import useScopedActions from "./use-scoped-actions";

export default function useCanvasWorkflow(canvasId: string) {
  const editorContext = useContext(EditorContext);

  const { runAction } = useScopedActions();

  const [workflow, setWorkflow] = useState<Workflow | undefined>(undefined);
  const [pendingNodes, setPendingNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [runningNodes, setRunningNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [entryPoint, setEntryPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(undefined);

  // Load workflow from editor context based on canvasId
  useEffect(() => {
    const workflow = editorContext?.editorStates.workflows?.[canvasId];

    if (!workflow) {
      addToast({
        title: "No Workflow Found",
        description: `No workflow found for canvas ID: ${canvasId}`,
        color: "danger",
      });
    }

    setWorkflow(workflow);
  }, [canvasId]);

  // Update editor context when workflow changes
  useEffect(() => {
    if (workflow) {
      // Update workflow in editor context
      debouncedSyncWorkflow(workflow);
    }
  }, [workflow]);

  // Update entry points
  useEffect(() => {
    debouncedGetEntryPoint();
  }, [workflow]);

  async function startWorkflow() {
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

    const { selectedAction } = entryPoint.data as AppNodeData;

    if (!selectedAction) {
      addToast({
        title: "No Action Selected",
        description: "Please select an action for the node to run.",
        color: "danger",
      });
      return;
    }

    // setRunningNodes([entryPoint]);

    updateWorkflowNodeData(entryPoint.id, { isRunning: true });
    runAction(
      {
        action: selectedAction,
        viewId: entryPoint.id,
        type: "app",
      },
      {},
    ).then((result) => {
      addToast({
        title: "Workflow Completed",
        description: `The workflow has completed with result: ${JSON.stringify(
          result,
        )}`,
        color: "success",
      });
      updateWorkflowNodeData(entryPoint.id, { isRunning: false });
    });
  }

  async function pauseWorkflow() {
    setIsPaused(true);
  }

  async function resumeWorkflow() {
    setIsPaused(false);
  }

  async function resetWorkflow() {
    if (!workflow) {
      addToast({
        title: "No Workflow Loaded",
        description: "Cannot reset workflow as no workflow is loaded.",
      });
      return;
    }

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

  const debouncedSyncWorkflow = useDebouncedCallback((wf: Workflow) => {
    if (!editorContext) return;

    editorContext.setEditorStates((prev) => ({
      ...prev,
      workflows: {
        ...prev.workflows,
        [canvasId]: wf,
      },
    }));
  }, 500);

  const debouncedGetEntryPoint = useDebouncedCallback(() => {
    const entry =
      workflow?.nodes.find((node) => node.selected) ??
      workflow?.defaultEntryPoint;
    setEntryPoint(entry);
  }, 200);

  const updateWorkflowNodeData = useCallback(
    (nodeViewId: string, data: Partial<AppNodeData>) => {
      setWorkflow((prev) => {
        if (!prev) return undefined;
        const idx = prev.nodes.findIndex((node) => node.id === nodeViewId);
        if (idx === -1) return prev;
        const updatedNode = {
          ...prev.nodes[idx],
          data: { ...prev.nodes[idx].data, ...data },
        };
        const newNodes = [...prev.nodes];
        newNodes[idx] = updatedNode;
        return { ...prev, nodes: newNodes };
      });
    },
    [workflow],
  );

  const updateWorkflowNodes = useCallback(
    (
      updater: (
        oldNodes: ReactFlowNode<AppNodeData>[],
      ) => ReactFlowNode<AppNodeData>[],
    ) => {
      const updatedNodes = updater(workflow?.nodes ?? []);
      setWorkflow((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          nodes: updatedNodes,
        };
      });
    },
    [workflow],
  );

  const updateWorkflowEdges = useCallback(
    (updater: (oldEdges: ReactFlowEdge[]) => ReactFlowEdge[]) => {
      const updatedEdges = updater(workflow?.edges ?? []);
      setWorkflow((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          edges: updatedEdges,
        };
      });
    },
    [workflow],
  );

  const exportWorkflow = useCallback(() => {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [workflow]);

  return {
    workflow,
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
