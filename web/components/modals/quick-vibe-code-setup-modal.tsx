"use client";

import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { AppViewConfig, ExtensionApp } from "@/lib/types";
import { createAppViewId } from "@/lib/views/view-helpers";
import { addToast, Spinner } from "@heroui/react";
import { useContext, useEffect, useMemo, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function QuickVibeCodeSetupModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);
  const vibeCodeProject = t("quickVibeCodeSetupModal.vibeCodeProject");

  const { openProject } = useProjectManager();
  const { createAppViewInCanvasView } = useTabViewManager();

  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);

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
        title: t("quickVibeCodeSetupModal.appOpened.title"),
        description: t("quickVibeCodeSetupModal.appOpened.description"),
        color: "success",
      });
    } else {
      addToast({
        title: t("quickVibeCodeSetupModal.noAppToOpen"),
        color: "danger",
      });
    }
    onClose();
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
    await editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        isSideMenuOpen: false,
      };
    });
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t("quickVibeCodeSetupModal.title")}
    >
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        <div className="flex items-center gap-x-2">
          <Spinner />
          <p>{t("quickVibeCodeSetupModal.gettingReady")}</p>
        </div>
      </div>
    </ModalWrapper>
  );
}
