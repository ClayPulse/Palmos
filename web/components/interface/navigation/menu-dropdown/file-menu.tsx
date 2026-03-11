import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { createCanvasViewId } from "@/lib/views/view-helpers";
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

  return (
    <NavMenuDropdown category={t("fileMenu.title")} menuActions={menuActions} />
  );
}
