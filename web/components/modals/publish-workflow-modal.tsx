import { captureWorkflowCanvas } from "@/lib/html2canvas/print-canvas";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppNodeData, Workflow } from "@/lib/types";
import { addToast, Button, closeToast, Input } from "@heroui/react";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { useState } from "react";
import ModalWrapper from "./modal-wrapper";

export default function PublishWorkflowModal({
  isOpen,
  setIsOpen,
  workflowCanvas,
  localNodes,
  localEdges,
  entryPoint,
  saveAppsSnapshotStates,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workflowCanvas: HTMLElement | null;
  localNodes: ReactFlowNode<AppNodeData>[];
  localEdges: ReactFlowEdge[];
  entryPoint: ReactFlowNode<AppNodeData> | undefined;
  saveAppsSnapshotStates: () => Promise<{
    [key: string]: any;
  }>;
}) {
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");

  async function publishWorkflow() {
    try {
      if (!workflowCanvas) {
        console.error("Workflow canvas is not available");
        return;
      }

      setIsOpen(false);

      const res = await captureWorkflowCanvas(workflowCanvas);
      const dataUrl = res.toDataURL("image/png");

      const snapshotStates = await saveAppsSnapshotStates();

      const workflow: Workflow = {
        name: name,
        thumbnail: dataUrl,
        content: {
          nodes: localNodes ?? [],
          edges: localEdges ?? [],
          defaultEntryPoint: entryPoint,
          snapshotStates: snapshotStates,
        },
        version: version,
        visibility: "public",
      };

      await fetchAPI("/api/workflow/publish", {
        method: "POST",
        body: JSON.stringify({ ...workflow }),
      });

      addToast({
        title: "Workflow Published",
        description: "Your workflow has been published successfully.",
        color: "success",
      });
    } catch (error) {
      console.error("Error publishing workflow:", error);
      addToast({
        title: "Error",
        description: "There was an error publishing your workflow.",
        color: "danger",
      });
    }
  }

  async function handlePress() {
    const key = addToast({
      title: "Publishing Workflow",
      description: "Your workflow is being published...",
      promise: new Promise<void>(async (resolve) => {
        await publishWorkflow();
        if (key) closeToast(key);
        resolve();
      }),
    });
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={"Publish Workflow"}
      placement={"center"}
    >
      <div className="flex w-full flex-col items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          label="Workflow Name"
          placeholder="Enter workflow name"
        />

        <Input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          label="Workflow Version"
          placeholder="Enter workflow version"
        />

        <Button color="primary" onPress={handlePress}>
          Publish
        </Button>
      </div>
    </ModalWrapper>
  );
}
