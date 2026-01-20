import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { useEffect, useState } from "react";
import NavMenuDropdown from "../nav-menu-dropdown";

export default function FileMenuDropDown() {
  const { menuActions } = useMenuActions("file");
  const { createCanvasTabView, activeTabView, closeTabView } =
    useTabViewManager();

  useRegisterMenuAction(
    {
      name: "New Workflow",
      menuCategory: "file",
      shortcut: "Ctrl+Alt+N",
      icon: "add",
      description: "Create a new Workflow",
    },
    async () => {
      // Trigger new Workflow creation logic
      await createCanvasTabView({ viewId: createCanvasViewId() });
    },
    [],
  );

  const [isCloseWorkflowEnabled, setIsCloseWorkflowEnabled] = useState(false);
  useRegisterMenuAction(
    {
      name: "Close Workflow",
      menuCategory: "file",
      shortcut: "Ctrl+Alt+C",
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
