import { captureWorkflowCanvas } from "@/lib/html2canvas/print-canvas";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppNodeData, Workflow } from "@/lib/types";
import { addToast, Button, closeToast, Input } from "@heroui/react";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useContext, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function PublishWorkflowModal({
  isOpen,
  onClose,
  workflowCanvas,
  localNodes,
  localEdges,
  entryPoint,
  saveAppsSnapshotStates,
}: {
  isOpen: boolean;
  onClose: () => void;
  workflowCanvas: HTMLElement | null;
  localNodes: ReactFlowNode<AppNodeData>[];
  localEdges: ReactFlowEdge[];
  entryPoint: ReactFlowNode<AppNodeData> | undefined;
  saveAppsSnapshotStates?: () => Promise<{
    [key: string]: any;
  }>;
}) {
  const t = useTranslations();
  const editorContext = useContext(EditorContext);

  const [name, setName] = useState("");
  const [version, setVersion] = useState("");

  async function publishWorkflow() {
    try {
      if (!workflowCanvas) {
        console.error("Workflow canvas is not available");
        return;
      }

      onClose();

      const res = await captureWorkflowCanvas(workflowCanvas);
      const dataUrl = res.toDataURL("image/png");

      const snapshotStates = saveAppsSnapshotStates
        ? await saveAppsSnapshotStates()
        : undefined;

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
        requireWorkspace: localNodes
          .map((node) => node.data.config.app)
          .some((appId) =>
            editorContext?.persistSettings?.extensions?.find(
              (ext) => ext.config.id === appId && ext.config.requireWorkspace,
            ),
          ),
      };

      const response = await fetchAPI("/api/workflow/publish", {
        method: "POST",
        body: JSON.stringify({ ...workflow }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          "Failed to publish workflow. " + (await response.text()),
        );
      }

      addToast({
        title: t("publishWorkflowModal.toast.published.title"),
        description: t("publishWorkflowModal.toast.published.description"),
        color: "success",
      });
    } catch (error: any) {
      console.error("Error publishing workflow:", error);
      addToast({
        title: t("publishWorkflowModal.toast.failed.title"),
        description: error.message,
        color: "danger",
      });
    }
  }

  async function handlePress() {
    const key = addToast({
      title: t("publishWorkflowModal.publishing"),
      description: t("publishWorkflowModal.publishingDescription"),
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
      onClose={onClose}
      title={t("publishWorkflowModal.title")}
      placement={"center"}
    >
      <div className="flex w-full flex-col items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          label={t("publishWorkflowModal.workflowName")}
          placeholder={t("publishWorkflowModal.workflowNamePlaceholder")}
        />

        <Input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          label={t("publishWorkflowModal.workflowVersion")}
          placeholder={t("publishWorkflowModal.workflowVersionPlaceholder")}
        />

        <Button color="primary" onPress={handlePress}>
          {t("common.publish")}
        </Button>
      </div>
    </ModalWrapper>
  );
}
