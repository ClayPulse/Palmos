"use client";

import { PlatformEnum, SideMenuTabEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import {
  AppViewConfig,
  ExtensionApp,
  ProjectInfo,
  SpecOption,
  Workflow,
} from "@/lib/types";
import { getUnitFromUnitString, specsOptions } from "@/lib/workspace/specs";
import {
  addToast,
  Button,
  Divider,
  Input,
  NumberInput,
  Select,
  SelectItem,
} from "@heroui/react";
import { useContext, useEffect, useMemo, useState } from "react";
import { v4 } from "uuid";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function OpenInProjectModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const editorContext = useContext(EditorContext);

  const { platformApi } = usePlatformApi();
  const {
    workspace,
    createWorkspace,
    selectWorkspace,
    cloudWorkspaces,
    isWorkspaceHealthy,
  } = useWorkspace();

  const { openProject, createProject, refreshProjects } = useProjectManager();
  const { createAppViewInCanvasView, createCanvasTabView } =
    useTabViewManager();

  const [projectName, setProjectName] = useState("");
  const [isCreateNewProject, setIsCreateNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<
    ProjectInfo | undefined
  >(undefined);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const [isCreateNewWorkspace, setIsCreateNewWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [storage, setStorage] = useState(5);
  const [selectedSpec, setSelectedSpec] = useState<SpecOption>(specsOptions[0]);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);

  const isUseWorkspace = useMemo(() => {
    const { app, workflow } =
      editorContext?.editorStates.modalStates?.openInProject || {};
    if (app) {
      return app.config.requireWorkspace;
    } else if (workflow) {
      return workflow.requireWorkspace;
    }
    return false;
  }, [editorContext?.editorStates.modalStates?.openInProject]);

  // Prep workspace if needed when project is opened
  useEffect(() => {
    async function prepareWorkspace() {
      if (isProjectOpen && isUseWorkspace) {
        if (isCreateNewWorkspace) {
          await createNewWorkspace();
        } else {
          await selectWorkspace(workspace?.id);
        }

        addToast({
          title: "Preparing workspace",
          description: "Waiting for workspace to be ready...",
        });
      }
    }

    prepareWorkspace();
  }, [isProjectOpen, isUseWorkspace]);

  // Wait until workspace is healthy
  useEffect(() => {
    if (isProjectOpen && isUseWorkspace && isWorkspaceHealthy) {
      setIsWorkspaceReady(true);
    }
  }, [isWorkspaceHealthy, isProjectOpen, isUseWorkspace]);

  // If workspace is needed and ready, open the app/workflow;
  // or if workspace is not needed, open the app/workflow directly
  useEffect(() => {
    async function openWhenReady() {
      if (isProjectOpen) {
        if ((isUseWorkspace && isWorkspaceReady) || !isUseWorkspace) {
          await openAppOrWorkflow();
          // Reset states
          setIsProjectOpen(false);
          setIsWorkspaceReady(false);
        }
      }
    }

    openWhenReady();
  }, [isWorkspaceReady, isProjectOpen, isUseWorkspace]);

  async function handleOpenInProject() {
    if (!selectedProject) {
      addToast({
        title: "Failed to open.",
        description: "No project selected.",
        color: "danger",
      });
      return;
    }

    openProject(selectedProject.name);
    setIsProjectOpen(true);
  }

  async function handleOpenInNewProject() {
    await createProject({ name: projectName });
    await refreshProjects();

    openProject(projectName);
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      sideMenuTab: SideMenuTabEnum.Apps,
    }));
    setIsProjectOpen(true);
  }

  async function openAppOrWorkflow() {
    if (editorContext?.editorStates.modalStates?.openInProject?.app) {
      await openApp(
        editorContext?.editorStates.modalStates?.openInProject?.app,
      );

      addToast({
        title: "App opened",
        description: "App has been opened successfully.",
        color: "success",
      });
    } else if (
      editorContext?.editorStates.modalStates?.openInProject?.workflow
    ) {
      await openWorkflow(
        editorContext?.editorStates.modalStates?.openInProject?.workflow,
      );

      addToast({
        title: "Workflow opened",
        description: "Workflow has been opened successfully.",
        color: "success",
      });
    } else {
      addToast({
        title: "No app or workflow to open.",
        color: "danger",
      });
    }
    onClose();
  }

  async function openApp(app: ExtensionApp) {
    const config: AppViewConfig = {
      app: app.config.id,
      viewId: `${app.config.id}-${v4()}`,
      recommendedHeight: app.config.recommendedHeight,
      recommendedWidth: app.config.recommendedWidth,
    };
    await createAppViewInCanvasView(config);
  }

  async function openWorkflow(workflow: Workflow) {
    await createCanvasTabView(
      {
        viewId: `canvas-${v4()}`,
        appConfigs: workflow.content.nodes.map((node) => node.data.config),
        initialWorkflowContent: workflow.content,
      },
      false,
    );
  }

  async function createNewWorkspace() {
    if (!platformApi) {
      addToast({
        title: "Unable to create workspace.",
        description: "Unknown platform.",
        color: "danger",
      });
      return;
    } else if (workspaceName === "") {
      addToast({
        title: "Unable to create workspace.",
        description: "Workspace Name is required.",
        color: "danger",
      });
      return;
    }

    // Create workspace
    try {
      const specs = selectedSpec.key;
      const volumeSize = getUnitFromUnitString(storage.toString(), "Gi");

      addToast({
        title: "Creating workspace",
        description: `Creating workspace ${workspaceName}. Specifications: ${
          selectedSpec.vCPU
        } vCPU, ${selectedSpec.ram} RAM, ${volumeSize} storage.`,
      });
      await createWorkspace(workspaceName, specs, volumeSize);
      addToast({
        title: "Workspace created",
        description: `Workspace ${workspaceName} has been created successfully.`,
        color: "success",
      });
      setIsCreateNewWorkspace(false);
    } catch (error: any) {
      addToast({
        title: "Error creating workspace",
        description: error.message,
        color: "danger",
      });
    }
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Open In Project">
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        {isCreateNewProject ? (
          <div className="flex w-full flex-col items-center gap-y-1">
            <p>Open in new project</p>
            <Input
              label="Project Name"
              isRequired
              value={projectName}
              onValueChange={setProjectName}
            />
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-y-1">
            <p>Open in existing project</p>
            <Select
              label="Select Project"
              isRequired
              value={selectedProject?.name ?? undefined}
              onSelectionChange={(value) => {
                if (value.currentKey === selectedProject?.name) {
                  setSelectedProject(() => undefined);
                  return;
                }

                const project = editorContext?.editorStates.projectsInfo?.find(
                  (proj) => proj.name === value.currentKey,
                );
                setSelectedProject(() => project ?? undefined);
              }}
              size="sm"
            >
              {editorContext?.editorStates.projectsInfo?.map((project) => (
                <SelectItem key={project.name}>{project.name}</SelectItem>
              )) ?? []}
            </Select>
          </div>
        )}

        {isUseWorkspace && (
          <div className="flex flex-col items-center gap-y-1">
            <p>
              This app/workflow requires a workspace to be opened in order to
              function properly.
            </p>

            <div className="flex w-full justify-center px-8">
              <Select
                color="default"
                className="w-full"
                classNames={{
                  mainWrapper: "h-10",
                  trigger: "py-0.5 min-h-10",
                }}
                label="Select Workspace"
                placeholder="Select Workspace"
                isLoading={
                  !editorContext?.editorStates?.isSigningIn && !cloudWorkspaces
                }
                selectedKeys={
                  workspace
                    ? [workspace.id]
                    : getPlatform() === PlatformEnum.Electron
                      ? ["__internal-local"]
                      : []
                }
                size="sm"
                disabledKeys={workspace ? [] : ["settings"]}
                onSelectionChange={async (key) => {
                  if (key.currentKey === "__internal-create-new") {
                    await selectWorkspace(undefined);
                    setIsCreateNewWorkspace(true);
                    return;
                  } else if (key.currentKey === "__internal-settings") {
                    await selectWorkspace(undefined);
                    return;
                  } else if (key.currentKey === "__internal-local") {
                    await selectWorkspace(undefined);
                    return;
                  }

                  setIsCreateNewWorkspace(false);

                  const selectedWorkspace = cloudWorkspaces?.find(
                    (workspace) => workspace.id === key.currentKey,
                  );
                  await selectWorkspace(selectedWorkspace?.id);
                }}
              >
                <>
                  {getPlatform() === PlatformEnum.Electron && (
                    <SelectItem key={"__internal-local"}>
                      Local Computer
                    </SelectItem>
                  )}
                  {cloudWorkspaces?.map((workspace) => (
                    <SelectItem key={workspace.id}>{workspace.name}</SelectItem>
                  )) ?? []}
                  <SelectItem
                    key={"__internal-create-new"}
                    className="bg-primary text-primary-foreground"
                    color="primary"
                    startContent={
                      <div className="text-primary-foreground h-4 w-4">
                        <Icon name="add" variant="round" />
                      </div>
                    }
                  >
                    Create New
                  </SelectItem>
                </>
              </Select>
            </div>

            {isCreateNewWorkspace && (
              <>
                <Divider />
                <Input
                  label="Workspace Name"
                  isRequired
                  value={workspaceName}
                  onValueChange={setWorkspaceName}
                />
                <Select
                  label="Workspace Specs"
                  selectedKeys={[selectedSpec.key]}
                  onSelectionChange={(key) => {
                    const spec = specsOptions.find(
                      (option) => option.key === key.currentKey,
                    );
                    if (spec) {
                      setSelectedSpec(spec);
                    }
                  }}
                  disabledKeys={["more to come"]}
                  isDisabled={workspace ? true : false}
                >
                  <>
                    {specsOptions.map((option) => (
                      <SelectItem
                        key={option.key}
                      >{`${option.vCPU} vCPU, ${option.ram} GB RAM`}</SelectItem>
                    ))}
                    <SelectItem isReadOnly key={"more to come"}>
                      <p className="pl-5 text-center">More to come</p>
                    </SelectItem>
                  </>
                </Select>
                <NumberInput
                  label="Storage (GB)"
                  value={storage}
                  onValueChange={setStorage}
                  minValue={2}
                  maxValue={512}
                  isDisabled={workspace ? true : false}
                />
              </>
            )}
          </div>
        )}

        <div className="flex gap-x-2">
          {isCreateNewProject ? (
            <Button onPress={handleOpenInNewProject} color="primary">
              Create
            </Button>
          ) : (
            <Button
              onPress={handleOpenInProject}
              color="primary"
              isDisabled={!selectedProject}
            >
              Open
            </Button>
          )}

          {isCreateNewProject ? (
            <Button onPress={() => setIsCreateNewProject(false)}>
              Select Existing Project
            </Button>
          ) : (
            <Button onPress={() => setIsCreateNewProject(true)}>
              Create New Project
            </Button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
