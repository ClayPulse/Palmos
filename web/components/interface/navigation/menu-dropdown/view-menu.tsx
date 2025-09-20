import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import NavMenuDropdown from "../nav-menu-dropdown";
import { MenuAction } from "@/lib/types";
import { useContext, useEffect } from "react";
import { EditorContext } from "@/components/providers/editor-context-provider";

export default function ViewMenuDropDown() {
  const editorContext = useContext(EditorContext);
  const { menuActions, registerMenuAction } = useMenuActions("view");

  const defaultMenuActions: MenuAction[] = [
    {
      name: "View Command Viewer",
      actionFunc: async () => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isCommandViewerOpen: true,
        }));
      },
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: "View all commands and shortcuts",
    },
  ];

  // Register default menu actions if not already registered
  useEffect(() => {
    defaultMenuActions.forEach((action) => {
      registerMenuAction(action);
    });
  }, [registerMenuAction]);

  return <NavMenuDropdown category="View" menuActions={menuActions} />;
}
