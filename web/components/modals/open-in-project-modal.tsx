"use client";

import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { useTranslations } from '@/lib/hooks/use-translations';
import {
  AppViewConfig,
  ExtensionApp,
  ProjectInfo,
  SpecOption,
  Workflow,
} from "@/lib/types";
import { createAppViewId, createCanvasViewId } from "@/lib/views/view-helpers";
import { getUnitFromUnitString, specsOptions } from "@/lib/workspace/specs";
import {
  addToast,
  Button,
  Divider,
  Input,
  NumberInput,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { useContext, useEffect, useMemo, useState } from "react";
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
  const {getTranslations: t} = useTranslations();
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
  const [isLoading, setIsLoading] = useState(false);

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
          title: t('openInProjectModal.toast.preparingWorkspace.title'),
          description: t('openInProjectModal.toast.preparingWorkspace.description'),
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
          await openAppOrWorkflow(
            editorContext?.editorStates.modalStates?.openInProject
              ?.isOpenAppInFullscreen,
          );
          // Reset states
          setIsProjectOpen(false);
          setIsWorkspaceReady(false);
        }
      }
    }

    openWhenReady();
  }, [isWorkspaceReady, isProjectOpen, isUseWorkspace]);

  async function handleOpenInProject() {
    setIsLoading(true);
    if (!selectedProject) {
      addToast({
        title: t('openInProjectModal.toast.failedToOpen.title'),
        description: t('openInProjectModal.toast.failedToOpen.description'),
        color: "danger",
      });
      return;
    }

    openProject(selectedProject.name);
    setIsProjectOpen(true);
  }

  async function handleOpenInNewProject() {
    setIsLoading(true);
    await createProject({ name: projectName });
    await refreshProjects();

    openProject(projectName);
    setIsProjectOpen(true);
  }

  async function openAppOrWorkflow(isAppFullscreen?: boolean) {
    if (editorContext?.editorStates.modalStates?.openInProject?.app) {
      await openApp(
        editorContext?.editorStates.modalStates?.openInProject?.app,
        isAppFullscreen,
      );

      addToast({
        title: t('openInProjectModal.toast.appOpened.title'),
        description: t('openInProjectModal.toast.appOpened.description'),
        color: "success",
      });
    } else if (
      editorContext?.editorStates.modalStates?.openInProject?.workflow
    ) {
      await openWorkflow(
        editorContext?.editorStates.modalStates?.openInProject?.workflow,
      );

      addToast({
        title: t('openInProjectModal.toast.workflowOpened.title'),
        description: t('openInProjectModal.toast.workflowOpened.description'),
        color: "success",
      });
    } else {
      addToast({
        title: t('openInProjectModal.toast.noAppOrWorkflow'),
        color: "danger",
      });
    }
    onClose();
    setIsLoading(false);
  }

  async function openApp(app: ExtensionApp, isFullscreen?: boolean) {
    const config: AppViewConfig = {
      app: app.config.id,
      requiredVersion: app.config.version,
      viewId: createAppViewId(app.config.id),
      initialHeight: app.config.recommendedHeight,
      initialWidth: app.config.recommendedWidth,
      initialIsFullscreen: isFullscreen,
    };
    await createAppViewInCanvasView(config);
  }

  async function openWorkflow(workflow: Workflow) {
    await createCanvasTabView(
      {
        viewId: createCanvasViewId(),
        appConfigs: workflow.content.nodes.map((node) => node.data.config),
        initialWorkflowContent: workflow.content,
      },
      false,
    );
  }

  async function createNewWorkspace() {
    if (!platformApi) {
      addToast({
        title: t('openInProjectModal.toast.unableToCreate.title'),
        description: t('openInProjectModal.toast.unableToCreate.unknownPlatform'),
        color: "danger",
      });
      return;
    } else if (workspaceName === "") {
      addToast({
        title: t('openInProjectModal.toast.unableToCreate.title'),
        description: t('openInProjectModal.toast.unableToCreate.nameRequired'),
        color: "danger",
      });
      return;
    }

    // Create workspace
    try {
      const specs = selectedSpec.key;
      const volumeSize = getUnitFromUnitString(storage.toString(), "Gi");

      addToast({
        title: t('openInProjectModal.toast.creatingWorkspace.title'),
        description: t('openInProjectModal.toast.creatingWorkspace.description', {
          name: workspaceName,
          cpu: selectedSpec.vCPU,
          ram: selectedSpec.ram,
          storage: volumeSize
        }),
      });
      await createWorkspace(workspaceName, specs, volumeSize);
      addToast({
        title: t('openInProjectModal.toast.workspaceCreated.title'),
        description: t('openInProjectModal.toast.workspaceCreated.description', { name: workspaceName }),
        color: "success",
      });
      setIsCreateNewWorkspace(false);
    } catch (error: any) {
      addToast({
        title: t('openInProjectModal.toast.errorCreating.title'),
        description: error.message,
        color: "danger",
      });
    }
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={t('openInProjectModal.title')}>
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        {isCreateNewProject ? (
          <div className="flex w-full flex-col items-center gap-y-1">
            <p>{t('openInProjectModal.newProject')}</p>
            <Input
              label={t('openInProjectModal.projectName')}
              isRequired
              value={projectName}
              onValueChange={setProjectName}
            />
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-y-1">
            <p>{t('openInProjectModal.openExisting')}</p>
            <Select
              label={t('openInProjectModal.selectProjectFolder')}
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
              {t('openInProjectModal.workspaceRequired')}
            </p>

            <div className="flex w-full justify-center px-8">
              <Select
                color="default"
                className="w-full"
                classNames={{
                  mainWrapper: "h-10",
                  trigger: "py-0.5 min-h-10",
                }}
                label={t('openInProjectModal.selectWorkspace')}
                placeholder={t('openInProjectModal.selectWorkspace')}
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
                      {t('openInProjectModal.localComputer')}
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
                    {t('common.create')}
                  </SelectItem>
                </>
              </Select>
            </div>

            {isCreateNewWorkspace && (
              <>
                <Divider />
                <Input
                  label={t('openInProjectModal.workspaceName')}
                  isRequired
                  value={workspaceName}
                  onValueChange={setWorkspaceName}
                />
                <Select
                  label={t('openInProjectModal.workspaceSpecs')}
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
                      <p className="pl-5 text-center">{t('openInProjectModal.moreToCome')}</p>
                    </SelectItem>
                  </>
                </Select>
                <NumberInput
                  label={t('openInProjectModal.storageGB')}
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
            <Button
              onPress={handleOpenInNewProject}
              color="primary"
              isDisabled={isLoading}
            >
              {t('openInProjectModal.create')}
            </Button>
          ) : (
            <Button
              onPress={handleOpenInProject}
              color="primary"
              isDisabled={!selectedProject || isLoading}
            >
              {t('openInProjectModal.open')}
            </Button>
          )}

          {isCreateNewProject ? (
            <Button
              onPress={() => setIsCreateNewProject(false)}
              isDisabled={isLoading}
            >
              {t('openInProjectModal.selectProjectFolder')}
            </Button>
          ) : (
            <Button
              onPress={() => setIsCreateNewProject(true)}
              isDisabled={isLoading}
            >
              {t('openInProjectModal.newProject')}
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-x-2">
            <Spinner />
            <p>{t('openInProjectModal.gettingReady')}</p>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
