import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import NavMenuDropdown from "../nav-menu-dropdown";
import { MenuAction } from "@/lib/types";
import { useEffect } from "react";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { v4 } from "uuid";

export default function FileMenuDropDown() {
  const { menuActions, registerMenuAction } = useMenuActions("file");
  const { createTabView } = useTabViewManager();

  const defaultMenuActions: MenuAction[] = [
    {
      name: "New Workflow",
      actionFunc: async () => {
        // Trigger new Workflow creation logic
        await createTabView(ViewModeEnum.Canvas, { viewId: v4() });
      },
      menuCategory: "file",
      shortcut: "Ctrl+N",
      icon: "add",
      description: "Create a new Workflow",
    },
  ];

  // Register default menu actions if not already registered
  useEffect(() => {
    defaultMenuActions.forEach((action) => {
      registerMenuAction(action);
    });
  }, [registerMenuAction]);

  return <NavMenuDropdown category="File" menuActions={menuActions} />;
}
