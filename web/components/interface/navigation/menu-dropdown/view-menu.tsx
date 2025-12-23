import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { CanvasViewConfig, WorkflowContent } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import { v4 } from "uuid";
import NavMenuDropdown from "../nav-menu-dropdown";

export default function ViewMenuDropDown() {
  const editorContext = useContext(EditorContext);
  const { menuActions } = useMenuActions("view");

  // Command Viewer
  const [isCommandViewerOpen, setIsCommandViewerOpen] = useState(false);

  useRegisterMenuAction(
    {
      name: "Close Command Viewer",
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: "Close the command viewer",
    },
    async () => {
      console.log("Closing command viewer");
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isCommandViewerOpen: false,
      }));
    },
    [],
    isCommandViewerOpen,
  );

  useRegisterMenuAction(
    {
      name: "View Command Viewer",
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: "View all commands and shortcuts",
    },
    async () => {
      console.log("Opening command viewer");
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isCommandViewerOpen: true,
      }));
    },
    [],
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
      menuCategory: "file",
      description: "Import a workflow from a JSON file",
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
              const viewId = "canvas-" + v4();
              await createCanvasTabView({
                viewId,
                appConfigs: workflowContent.nodes.map(
                  (node) => node.data.config,
                ),
                initialWorkflowContent: workflowContent,
              } as CanvasViewConfig);
            } else {
              alert("Invalid workflow file");
            }
          } catch (err) {
            alert("Error reading workflow file");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    [
      editorContext?.editorStates.project,
      editorContext?.editorStates.currentWorkspace,
    ],
  );

  return <NavMenuDropdown category="View" menuActions={menuActions} />;
}
