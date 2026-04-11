import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { CanvasViewConfig, WorkflowContent } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import {
  convertSimplifiedToWorkflowContent,
  isSimplifiedWorkflow,
  type SimplifiedWorkflowDAG,
} from "@/lib/workflow/simplified-workflow";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useRef, useState } from "react";
import NavMenuDropdown from "../nav-menu-dropdown";
import ImportWorkflowModal from "@/components/modals/import-workflow-modal";
import WorkflowEnvSetupModal from "@/components/modals/workflow-env-setup-modal";

export default function ViewMenuDropDown() {
  const { getTranslations: t, locale } = useTranslations();
  const editorContext = useContext(EditorContext);
  const { menuActions } = useMenuActions("view");

  // Command Viewer
  const [isCommandViewerOpen, setIsCommandViewerOpen] = useState(false);

  useRegisterMenuAction(
    {
      name: "Close Command Viewer",
      displayName: t("viewMenu.closeCommandViewer.name"),
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: t("viewMenu.closeCommandViewer.description"),
    },
    async () => {
      console.log("Closing command viewer");
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isCommandViewerOpen: false,
      }));
    },
    [locale],
    isCommandViewerOpen,
  );

  useRegisterMenuAction(
    {
      name: "View Command Viewer",
      displayName: t("viewMenu.viewCommandViewer.name"),
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: t("viewMenu.viewCommandViewer.description"),
    },
    async () => {
      console.log("Opening command viewer");
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isCommandViewerOpen: true,
      }));
    },
    [locale],
    !isCommandViewerOpen,
  );

  useEffect(() => {
    setIsCommandViewerOpen(
      editorContext?.editorStates.isCommandViewerOpen ?? false,
    );
  }, [editorContext?.editorStates.isCommandViewerOpen]);

  // Workflow
  const { createCanvasTabView } = useTabViewManager();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const pendingWorkflowContent = useRef<WorkflowContent | null>(null);
  const [envSetup, setEnvSetup] = useState<{
    isOpen: boolean;
    workflowName: string;
    env: Record<string, string>;
  } | null>(null);

  const isCurrentTabCanvas =
    editorContext?.editorStates.tabViews[
      editorContext?.editorStates.tabIndex
    ]?.type === ViewModeEnum.Canvas;

  function importToNewTab(workflowContent: WorkflowContent) {
    const viewId = createCanvasViewId();
    createCanvasTabView({
      viewId,
      appConfigs: workflowContent.nodes.map((node) => node.data.config),
      initialWorkflowContent: workflowContent,
    } as CanvasViewConfig);

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isSideMenuOpen: true,
    }));
  }

  function proceedWithImport(workflowContent: WorkflowContent) {
    if (isCurrentTabCanvas) {
      pendingWorkflowContent.current = workflowContent;
      setImportModalOpen(true);
    } else {
      importToNewTab(workflowContent);
      pendingWorkflowContent.current = null;
    }
  }

  function importToCurrentCanvas(workflowContent: WorkflowContent) {
    if (!editorContext) return;
    editorContext.setEditorStates((prev) => ({
      ...prev,
      pendingWorkflowImport: workflowContent,
    }));
  }

  useRegisterMenuAction(
    {
      name: "Import Workflow",
      displayName: t("viewMenu.importWorkflow.name"),
      menuCategory: "file",
      description: t("viewMenu.importWorkflow.description"),
      shortcut: "Ctrl+Alt+I",
      icon: "upload",
    },
    async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,.yaml,.yml";
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const raw = event.target?.result as string;
            const isYaml = file.name.endsWith(".yaml") || file.name.endsWith(".yml");
            const parsed = isYaml
              ? (await import("js-yaml")).load(raw)
              : JSON.parse(raw);
            // Accept either the full ReactFlow-compatible WorkflowContent or
            // the simplified authoring DAG format. Detect and compile the
            // latter down to WorkflowContent before proceeding.
            const isSimplified = isSimplifiedWorkflow(parsed);
            const workflowContent: WorkflowContent = isSimplified
              ? convertSimplifiedToWorkflowContent(parsed as SimplifiedWorkflowDAG)
              : (parsed as WorkflowContent);
            if (workflowContent) {
              // Stash the content so the env-setup or import-modal callbacks
              // can pick it up after user interaction completes.
              pendingWorkflowContent.current = workflowContent;

              // If the simplified DAG declares env vars, prompt the user first.
              const env = isSimplified
                ? (parsed as SimplifiedWorkflowDAG).env
                : undefined;
              if (env && Object.keys(env).length > 0) {
                setEnvSetup({
                  isOpen: true,
                  workflowName: (parsed as SimplifiedWorkflowDAG).name,
                  env,
                });
              } else {
                proceedWithImport(workflowContent);
              }
            } else {
              alert(t("viewMenu.importWorkflow.invalidFile"));
            }
          } catch (err) {
            alert(t("viewMenu.importWorkflow.readError"));
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    [
      editorContext?.editorStates.project,
      editorContext?.editorStates.currentWorkspace,
      locale,
    ],
  );

  return (
    <>
      <NavMenuDropdown
        category={t("viewMenu.title")}
        menuActions={menuActions}
      />
      {envSetup && (
        <WorkflowEnvSetupModal
          isOpen={envSetup.isOpen}
          workflowName={envSetup.workflowName}
          envEntries={envSetup.env}
          onClose={() => {
            setEnvSetup(null);
            pendingWorkflowContent.current = null;
          }}
          onComplete={() => {
            setEnvSetup(null);
            if (pendingWorkflowContent.current) {
              proceedWithImport(pendingWorkflowContent.current);
            }
          }}
        />
      )}
      <ImportWorkflowModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          pendingWorkflowContent.current = null;
        }}
        onSelectNewTab={() => {
          if (pendingWorkflowContent.current) {
            importToNewTab(pendingWorkflowContent.current);
          }
          setImportModalOpen(false);
          pendingWorkflowContent.current = null;
        }}
        onSelectCurrentCanvas={() => {
          if (pendingWorkflowContent.current) {
            importToCurrentCanvas(pendingWorkflowContent.current);
          }
          setImportModalOpen(false);
          pendingWorkflowContent.current = null;
        }}
        isCurrentTabCanvas={isCurrentTabCanvas}
      />
    </>
  );
}
