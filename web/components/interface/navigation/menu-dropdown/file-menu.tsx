import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/use-register-menu-action";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import { v4 } from "uuid";
import NavMenuDropdown from "../nav-menu-dropdown";

export default function FileMenuDropDown() {
  const { menuActions } = useMenuActions("file");
  const { createTabView, activeTabView, closeTabView } = useTabViewManager();

  useRegisterMenuAction(
    {
      name: "New Workflow",
      menuCategory: "file",
      shortcut: "Ctrl+N",
      icon: "add",
      description: "Create a new Workflow",
    },
    async () => {
      // Trigger new Workflow creation logic
      await createTabView(ViewModeEnum.Canvas, { viewId: v4() });
    },
    [],
  );

  const [isCloseWorkflowEnabled, setIsCloseWorkflowEnabled] = useState(false);
  useRegisterMenuAction(
    {
      name: "Close Workflow",
      menuCategory: "file",
      shortcut: "Ctrl+C",
      icon: "close",
      description: "Close the current workflow",
    },
    async () => {
      if (activeTabView) {
        closeTabView(activeTabView);
      }
    },
    [activeTabView],
    isCloseWorkflowEnabled,
  );

  useEffect(() => {
    setIsCloseWorkflowEnabled(activeTabView !== undefined);
  }, [activeTabView]);

  return <NavMenuDropdown category="File" menuActions={menuActions} />;
}
