import { EditorContext } from "@/components/providers/editor-context-provider";
import { addToast } from "@heroui/react";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { useCallback, useContext, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { AppNodeData } from "../types";
import useScopedActions from "./use-scoped-actions";

export default function useCanvasWorkflow(canvasId: string | undefined) {
  const editorContext = useContext(EditorContext);

  const { runAction } = useScopedActions();

  const [pendingNodes, setPendingNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [entryPoint, setEntryPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(undefined);

  const workflow = editorContext?.editorStates.workflows?.find(
    (wf) => wf.viewId === canvasId,
  )?.workflow;

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

  const debouncedGetEntryPoint = useDebouncedCallback(() => {
    const entry =
      workflow?.nodes.find((node) => node.selected) ??
      workflow?.defaultEntryPoint;
    setEntryPoint(entry);
  }, 200);

  const updateWorkflowNodeData = useCallback(
    (nodeViewId: string, data: Partial<AppNodeData>) => {
      if (!canvasId) return;
      editorContext?.setEditorStates((prev) => {
        if (!prev.workflows) return prev;
        const wfIdx = prev.workflows.findIndex((wf) => wf.viewId === canvasId);
        if (wfIdx === -1) return prev;
        const workflow = prev.workflows[wfIdx].workflow;
        const nodeIdx = workflow.nodes.findIndex(
          (node) => node.id === nodeViewId,
        );
        if (nodeIdx === -1) return prev;
        const updatedNode = {
          ...workflow.nodes[nodeIdx],
          data: { ...workflow.nodes[nodeIdx].data, ...data },
        };
        const newNodes = [...workflow.nodes];
        newNodes[nodeIdx] = updatedNode;
        const newWorkflow = { ...workflow, nodes: newNodes };
        const newWorkflows = [...prev.workflows];
        newWorkflows[wfIdx] = { viewId: canvasId, workflow: newWorkflow };
        return { ...prev, workflows: newWorkflows };
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
      if (!canvasId) return;
      const updatedNodes = updater(workflow?.nodes ?? []);
      editorContext?.setEditorStates((prev) => {
        if (!prev.workflows) return prev;
        const wfIdx = prev.workflows.findIndex((wf) => wf.viewId === canvasId);
        if (wfIdx === -1) return prev;
        const workflow = prev.workflows[wfIdx].workflow;
        const newWorkflow = { ...workflow, nodes: updatedNodes };
        const newWorkflows = [...prev.workflows];
        newWorkflows[wfIdx] = { viewId: canvasId, workflow: newWorkflow };
        return { ...prev, workflows: newWorkflows };
      });
    },
    [workflow],
  );

  const updateWorkflowEdges = useCallback(
    (updater: (oldEdges: ReactFlowEdge[]) => ReactFlowEdge[]) => {
      if (!canvasId) return;
      const updatedEdges = updater(workflow?.edges ?? []);
      editorContext?.setEditorStates((prev) => {
        if (!prev.workflows) return prev;
        const wfIdx = prev.workflows.findIndex((wf) => wf.viewId === canvasId);
        if (wfIdx === -1) return prev;
        const workflow = prev.workflows[wfIdx].workflow;
        const newWorkflow = { ...workflow, edges: updatedEdges };
        const newWorkflows = [...prev.workflows];
        newWorkflows[wfIdx] = { viewId: canvasId, workflow: newWorkflow };
        return { ...prev, workflows: newWorkflows };
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
