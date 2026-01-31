"use client";

import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { AppViewConfig, ExtensionApp, Workflow } from "@/lib/types";
import { createAppViewId, createCanvasViewId } from "@/lib/views/view-helpers";
import { addToast, Spinner } from "@heroui/react";
import { useContext, useEffect, useMemo, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

const vibeCodeProject = "Vibe Code Project";

export default function QuickVibeCodeSetupModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const editorContext = useContext(EditorContext);

  const { platformApi } = usePlatformApi();
  const { workspace, createWorkspace, selectWorkspace, isWorkspaceHealthy } =
    useWorkspace();

  const { openProject, createProject, refreshProjects } = useProjectManager();
  const { createAppViewInCanvasView, createCanvasTabView } =
    useTabViewManager();

  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const [isCreateNewWorkspace, setIsCreateNewWorkspace] = useState(false);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isUseWorkspace = useMemo(() => {
    const { app } =
      editorContext?.editorStates.modalStates?.quickVibeCodeSetup || {};
    if (app) {
      return app.config.requireWorkspace;
    }
    return false;
  }, [editorContext?.editorStates.modalStates?.quickVibeCodeSetup]);

  // Start opening project and app when modal is opened
  useEffect(() => {
    if (isOpen) {
      handleOpenInProject();
    }
  }, [isOpen]);

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
          await openAppOrWorkflow(true);
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

    openProject(vibeCodeProject);
    setIsProjectOpen(true);
  }

  async function openAppOrWorkflow(isAppFullscreen?: boolean) {
    if (editorContext?.editorStates.modalStates?.quickVibeCodeSetup?.app) {
      await openApp(
        editorContext?.editorStates.modalStates?.quickVibeCodeSetup?.app,
        isAppFullscreen,
      );

      addToast({
        title: "App opened",
        description: "App has been opened successfully.",
        color: "success",
      });
    } else {
      addToast({
        title: "No app to open.",
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

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Vibe Code Setup">
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        <div className="flex items-center gap-x-2">
          <Spinner />
          <p>Getting things ready for you...</p>
        </div>
      </div>
    </ModalWrapper>
  );
}
