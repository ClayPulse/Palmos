import { addToast } from "@heroui/react";
import { Node as ReactFlowNode } from "@xyflow/react";
import { useState } from "react";
import { AppNodeData, Workflow } from "../types";
import useScopedActions from "./use-scoped-actions";

export default function useWorkflow(
  workflow?: Workflow,
  entryPoint?: ReactFlowNode<AppNodeData>,
) {
  const { runAction } = useScopedActions();

  const [pendingNodes, setPendingNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [runningNodes, setRunningNodes] = useState<
    ReactFlowNode<AppNodeData>[]
  >([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  async function startWorkflow() {
    const currentEntry = getEntryPoint();

    console.log("Starting workflow from entry point:", currentEntry);

    if (!currentEntry) {
      addToast({
        title: "No Node Selected",
        description:
          "Please select a node as a entry point to run the workflow.",
        color: "danger",
      });
      return;
    }

    const { selectedAction } = currentEntry.data as AppNodeData;

    if (!selectedAction) {
      addToast({
        title: "No Action Selected",
        description: "Please select an action for the node to run.",
        color: "danger",
      });
      return;
    }

    setRunningNodes([currentEntry]);
    runAction(
      {
        action: selectedAction,
        viewId: currentEntry.id,
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
      setRunningNodes([]);
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

    const currentEntry = getEntryPoint();

    if (!currentEntry) {
      addToast({
        title: "No Entry Point Defined",
        description:
          "Please select a node as a entry point or define a default entry point to run the workflow.",
        color: "danger",
      });
      return;
    }
    setPendingNodes([currentEntry]);
  }

  function getEntryPoint() {
    const entry = entryPoint
      ? workflow?.nodes.find((n) => n.id === entryPoint.id)
      : workflow?.defaultEntryPoint
        ? workflow.defaultEntryPoint
        : undefined;
    return entry;
  }

  return {
    runningNodes,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
  };
}
