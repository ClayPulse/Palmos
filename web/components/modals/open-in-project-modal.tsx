"use client";

import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from '@/lib/hooks/use-translations';
import {
  AppViewConfig,
  ExtensionApp,
  ProjectInfo,
  Workflow,
} from "@/lib/types";
import { createAppViewId, createCanvasViewId } from "@/lib/views/view-helpers";
import {
  addToast,
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { useContext, useEffect, useState } from "react";
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

  const { openProject, createProject, refreshProjects } = useProjectManager();
  const { createAppViewInCanvasView, createCanvasTabView } =
    useTabViewManager();

  const [projectName, setProjectName] = useState("");
  const [isCreateNewProject, setIsCreateNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<
    ProjectInfo | undefined
  >(undefined);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // When project is opened, open the app/workflow directly
  useEffect(() => {
    async function openWhenReady() {
      if (isProjectOpen) {
        await openAppOrWorkflow(
          editorContext?.editorStates.modalStates?.openInProject
            ?.isOpenAppInFullscreen,
        );
        setIsProjectOpen(false);
      }
    }

    openWhenReady();
  }, [isProjectOpen]);

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
      workflow,
    );
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
