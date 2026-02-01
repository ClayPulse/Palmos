import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { CanvasViewConfig, WorkflowContent } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { useContext, useEffect, useState } from "react";
import NavMenuDropdown from "../nav-menu-dropdown";

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
      input.accept = "application/json";
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const workflowContent = JSON.parse(
              event.target?.result as string,
            ) as WorkflowContent;
            if (workflowContent) {
              // Create a new tab view with the imported workflow
              const viewId = createCanvasViewId();
              await createCanvasTabView({
                viewId,
                appConfigs: workflowContent.nodes.map(
                  (node) => node.data.config,
                ),
                initialWorkflowContent: workflowContent,
              } as CanvasViewConfig);
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
    <NavMenuDropdown category={t("viewMenu.title")} menuActions={menuActions} />
  );
}
