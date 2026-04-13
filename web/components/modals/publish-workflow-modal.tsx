import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useTranslations } from "@/lib/hooks/use-translations";
import { captureWorkflowCanvas } from "@/lib/html2canvas/print-canvas";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppNodeData, Workflow, WorkflowEnvDef } from "@/lib/types";
import {
  addToast,
  Button,
  closeToast,
  Input,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
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

type PublishMode = "update" | "new";

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
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);

  const { workflows: publishedWorkflows, isLoading: isLoadingWorkflows } =
    useMarketplaceWorkflows("Published by Me");

  const [publishMode, setPublishMode] = useState<PublishMode>("new");
  const [selectedWorkflow, setSelectedWorkflow] = useState<
    Workflow | undefined
  >(undefined);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [visibility, setVisibility] =
    useState<Workflow["visibility"]>("public");
  const [requiredEnvs, setRequiredEnvs] = useState<WorkflowEnvDef[]>([]);
  const visibilityOptions: Workflow["visibility"][] = [
    "public",
    "unlisted",
    "private",
  ];

  const hasPublishedWorkflows =
    publishedWorkflows && publishedWorkflows.length > 0;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (openedWorkflow) {
        setPublishMode("update");
        setSelectedWorkflow(openedWorkflow);
        setName(openedWorkflow.name);
        setVersion(bumpVersion(openedWorkflow.version));
        setVisibility(openedWorkflow.visibility);
        setDescription(openedWorkflow.description ?? "");
        setRequiredEnvs(openedWorkflow.content.requiredEnvs ?? []);
      } else {
        setPublishMode("new");
        setSelectedWorkflow(undefined);
        setName("");
        setVersion("");
        setVisibility("public");
        setDescription("");
        setRequiredEnvs([]);
      }
    }
  }, [isOpen]);

  function handleModeChange(mode: PublishMode) {
    setPublishMode(mode);
    if (mode === "new") {
      setSelectedWorkflow(undefined);
      setName("");
      setVersion("");
      setVisibility("public");
      setDescription("");
    } else if (mode === "update") {
      // Default to openedWorkflow if available, otherwise first published
      const defaultWf = openedWorkflow ?? publishedWorkflows?.[0];
      if (defaultWf) {
        handleSelectWorkflow(defaultWf);
      }
    }
  }

  function handleSelectWorkflow(workflow: Workflow) {
    setSelectedWorkflow(workflow);
    setName(workflow.name);
    setVersion(bumpVersion(workflow.version));
    setVisibility(workflow.visibility);
    setDescription(workflow.description ?? "");
    setRequiredEnvs(workflow.content.requiredEnvs ?? []);
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
          requiredEnvs: requiredEnvs.length > 0 ? requiredEnvs : undefined,
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

  const isUpdate = publishMode === "update";
  const updateLabel = selectedWorkflow
    ? `Update "${selectedWorkflow.name}"`
    : t("common.publish");

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t("publishWorkflowModal.title")}
      placement={"center"}
    >
      <div className="flex w-full flex-col items-center gap-2">
        {/* Mode toggle — always show if user has published workflows */}
        {hasPublishedWorkflows && (
          <div className="border-default-200 flex w-full overflow-hidden rounded-lg border">
            <button
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                isUpdate
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-default-100"
              }`}
              onClick={() => handleModeChange("update")}
            >
              Update Existing
            </button>
            <button
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                !isUpdate
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-default-100"
              }`}
              onClick={() => handleModeChange("new")}
            >
              Publish as New
            </button>
          </div>
        )}

        {/* Workflow selector for update mode */}
        {isUpdate && hasPublishedWorkflows && (
          <Select
            label="Select workflow to update"
            placeholder="Choose a workflow"
            selectedKeys={selectedWorkflow?.name ? [selectedWorkflow.name] : []}
            onChange={(e) => {
              const wf = publishedWorkflows?.find(
                (w) => w.name === e.target.value,
              );
              if (wf) handleSelectWorkflow(wf);
            }}
          >
            {publishedWorkflows!.map((wf) => (
              <SelectItem key={wf.name}>
                {wf.name}
                {wf.version ? ` (v${wf.version})` : ""}
              </SelectItem>
            ))}
          </Select>
        )}

        {isUpdate && isLoadingWorkflows && (
          <div className="flex w-full items-center justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          label={t("publishWorkflowModal.workflowName")}
          placeholder={t("publishWorkflowModal.workflowNamePlaceholder")}
          isDisabled={isUpdate}
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

        {/* Required Environment Variables */}
        <div className="w-full">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-small text-foreground">
              Required Environment Variables
            </label>
            <Button
              size="sm"
              variant="flat"
              onPress={() =>
                setRequiredEnvs((prev) => [
                  ...prev,
                  { key: "", description: "" },
                ])
              }
            >
              + Add
            </Button>
          </div>
          {requiredEnvs.length === 0 && (
            <p className="text-tiny text-default-400">
              No required envs. Users won't be prompted for any variables.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {requiredEnvs.map((env, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input
                  size="sm"
                  label="Key"
                  placeholder="e.g. OPENAI_API_KEY"
                  value={env.key}
                  onValueChange={(v) =>
                    setRequiredEnvs((prev) =>
                      prev.map((e, j) => (j === i ? { ...e, key: v } : e)),
                    )
                  }
                  className="flex-1"
                />
                <Input
                  size="sm"
                  label="Description"
                  placeholder="e.g. Your OpenAI key"
                  value={env.description}
                  onValueChange={(v) =>
                    setRequiredEnvs((prev) =>
                      prev.map((e, j) =>
                        j === i ? { ...e, description: v } : e,
                      ),
                    )
                  }
                  className="flex-1"
                />
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  className="mt-1"
                  onPress={() =>
                    setRequiredEnvs((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button color="primary" onPress={handlePress}>
          {isUpdate ? updateLabel : t("common.publish")}
        </Button>
      </div>
    </ModalWrapper>
  );
}
