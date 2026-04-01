import { captureWorkflowCanvas } from "@/lib/html2canvas/print-canvas";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppNodeData, Workflow } from "@/lib/types";
import {
  addToast,
  Button,
  closeToast,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

function bumpVersion(version: string): string {
  if (!version) return version;
  const parts = version.split(".");
  const lastPart = parts[parts.length - 1];
  const num = parseInt(lastPart, 10);
  if (!isNaN(num)) {
    parts[parts.length - 1] = String(num + 1);
    return parts.join(".");
  }
  return version;
}

export default function PublishWorkflowModal({
  isOpen,
  onClose,
  workflowCanvas,
  localNodes,
  localEdges,
  saveAppsSnapshotStates,
  openedWorkflow,
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
  openedWorkflow?: Workflow;
}) {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const openedWorkflowName = openedWorkflow?.name;

  type PublishMode = "update" | "new";
  const [publishMode, setPublishMode] = useState<PublishMode>(
    openedWorkflow ? "update" : "new",
  );
  const [name, setName] = useState(openedWorkflowName ?? "");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [visibility, setVisibility] = useState<Workflow["visibility"]>(
    "public",
  );
  const visibilityOptions: Workflow["visibility"][] = [
    "public",
    "unlisted",
    "private",
  ];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultMode: PublishMode = openedWorkflow ? "update" : "new";
      setPublishMode(defaultMode);
      setName(defaultMode === "update" ? (openedWorkflowName ?? "") : "");

      if (openedWorkflow) {
        setVersion(bumpVersion(openedWorkflow.version));
        setVisibility(openedWorkflow.visibility);
        setDescription(openedWorkflow.description ?? "");
      } else {
        setVersion("");
        setVisibility("public");
        setDescription("");
      }
    }
  }, [isOpen]);

  // Sync name when switching modes
  function handleModeChange(mode: PublishMode) {
    setPublishMode(mode);
    setName(mode === "update" ? (openedWorkflowName ?? "") : "");
  }

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

      const workflow = {
        name: name,
        description: description.trim() || undefined,
        thumbnail: dataUrl,
        content: {
          nodes: localNodes ?? [],
          edges: localEdges ?? [],
          snapshotStates: snapshotStates,
        },
        version: version,
        visibility,
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
        {openedWorkflowName && (
          <div className="border-default-200 flex w-full overflow-hidden rounded-lg border">
            <button
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                publishMode === "update"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-default-100"
              }`}
              onClick={() => handleModeChange("update")}
            >
              Update &ldquo;{openedWorkflowName}&rdquo;
            </button>
            <button
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                publishMode === "new"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-default-100"
              }`}
              onClick={() => handleModeChange("new")}
            >
              Publish as New
            </button>
          </div>
        )}

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          label={t("publishWorkflowModal.workflowName")}
          placeholder={t("publishWorkflowModal.workflowNamePlaceholder")}
          isDisabled={publishMode === "update"}
        />

        <Textarea
          value={description}
          onValueChange={setDescription}
          label="Description"
          placeholder="Briefly describe what this workflow does"
          minRows={2}
          maxRows={4}
        />

        <Input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          label={t("publishWorkflowModal.workflowVersion")}
          placeholder={t("publishWorkflowModal.workflowVersionPlaceholder")}
        />

        <Select
          label={t("sharingModal.visibility")}
          placeholder={t("sharingModal.visibilityPlaceholder")}
          selectedKeys={[visibility]}
          onChange={(e) =>
            setVisibility(e.target.value as Workflow["visibility"])
          }
        >
          {visibilityOptions.map((option) => (
            <SelectItem key={option}>{option}</SelectItem>
          ))}
        </Select>

        <Button color="primary" onPress={handlePress}>
          {publishMode === "update"
            ? `Update "${openedWorkflowName}"`
            : t("common.publish")}
        </Button>
      </div>
    </ModalWrapper>
  );
}
