import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import {
  convertSimplifiedToWorkflowContent,
  isSimplifiedWorkflow,
  type SimplifiedWorkflowDAG,
} from "@/lib/workflow/simplified-workflow";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { addToast } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import NavMenuDropdown from "../nav-menu-dropdown";

export default function FileMenuDropDown() {
  const editorContext = useContext(EditorContext);

  const { getTranslations: t, locale } = useTranslations();
  const { menuActions } = useMenuActions("file");
  const { createCanvasTabView, activeTabView, closeTabView } =
    useTabViewManager();

  useRegisterMenuAction(
    {
      name: "New Workflow",
      displayName: t("fileMenu.newWorkflow.name"),
      menuCategory: "file",
      shortcut: "Ctrl+Alt+N",
      icon: "add",
      description: t("fileMenu.newWorkflow.description"),
    },
    async () => {
      // Trigger new Workflow creation logic
      await createCanvasTabView({ viewId: createCanvasViewId() });

      // Open explorer for canvas views
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isSideMenuOpen: true,
      }));
    },
    [locale],
  );

  const [isCloseWorkflowEnabled, setIsCloseWorkflowEnabled] = useState(false);
  useRegisterMenuAction(
    {
      name: "Close Workflow",
      displayName: t("fileMenu.closeWorkflow.name"),
      menuCategory: "file",
      shortcut: "Ctrl+Alt+C",
      icon: "close",
      description: t("fileMenu.closeWorkflow.description"),
    },
    async () => {
      if (activeTabView) {
        closeTabView(activeTabView);
      }
    },
    [activeTabView, locale],
    isCloseWorkflowEnabled,
  );

  useEffect(() => {
    setIsCloseWorkflowEnabled(activeTabView !== undefined);
  }, [activeTabView]);

  useRegisterMenuAction(
    {
      name: "Upload Workflow",
      displayName: t("fileMenu.uploadWorkflow.name"),
      menuCategory: "file",
      shortcut: "Ctrl+Alt+U",
      icon: "cloud_upload",
      description: t("fileMenu.uploadWorkflow.description"),
    },
    async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,.yaml,.yml";
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const raw = event.target?.result as string;
            const isYaml =
              file.name.endsWith(".yaml") || file.name.endsWith(".yml");
            const parsed = isYaml
              ? (await import("js-yaml")).load(raw)
              : JSON.parse(raw);

            const isSimplified = isSimplifiedWorkflow(parsed);
            const content = isSimplified
              ? convertSimplifiedToWorkflowContent(
                  parsed as SimplifiedWorkflowDAG,
                )
              : parsed;

            if (!content) {
              addToast({ title: "Invalid workflow file", color: "danger" });
              return;
            }

            const workflowName =
              (isSimplified ? (parsed as any).name : undefined) ??
              file.name.replace(/\.(yaml|yml|json)$/, "");

            const res = await fetchAPI("/api/workflow/publish", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: workflowName,
                content,
                version: "1.0.0",
                visibility: "private",
                requireWorkspace: false,
                description:
                  (isSimplified ? (parsed as any).description : undefined) ??
                  undefined,
              }),
            });

            if (!res.ok) {
              const err = await res.json().catch(() => null);
              addToast({
                title: "Failed to upload workflow",
                description: err?.error ?? "Unknown error",
                color: "danger",
              });
              return;
            }

            addToast({
              title: "Workflow uploaded",
              description: `"${workflowName}" added to your library.`,
              color: "success",
            });
          } catch {
            addToast({ title: "Failed to read file", color: "danger" });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    [locale],
  );

  return (
    <NavMenuDropdown category={t("fileMenu.title")} menuActions={menuActions} />
  );
}
