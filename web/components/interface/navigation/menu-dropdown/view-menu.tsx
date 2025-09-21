import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import NavMenuDropdown from "../nav-menu-dropdown";
import { MenuAction } from "@/lib/types";
import { useContext, useEffect } from "react";
import { EditorContext } from "@/components/providers/editor-context-provider";

export default function ViewMenuDropDown() {
  const editorContext = useContext(EditorContext);
  const { menuActions, registerMenuAction, unregisterMenuAction } =
    useMenuActions("view");

  const defaultMenuActions: MenuAction[] = [];

  // Register default menu actions if not already registered
  useEffect(() => {
    console.log("Registering default menu actions");
    defaultMenuActions.forEach((action) => {
      registerMenuAction(action); 
    });
  }, []);

  useEffect(() => {
    const closeAction: MenuAction = {
      name: "Close Command Viewer",
      actionFunc: async () => {
        console.log("Closing command viewer");
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isCommandViewerOpen: false,
        }));
      },
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: "Close the command viewer",
    };

    const openAction: MenuAction = {
      name: "View Command Viewer",
      actionFunc: async () => {
        console.log("Opening command viewer");
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isCommandViewerOpen: true,
        }));
      },
      menuCategory: "view",
      shortcut: "F1",
      icon: "terminal",
      description: "View all commands and shortcuts",
    };
    if (editorContext?.editorStates.isCommandViewerOpen) {
      // Register the close action and unregister the open action
      unregisterMenuAction(openAction);
      registerMenuAction(closeAction);
    } else {
      // Register the open action and unregister the close action
      unregisterMenuAction(closeAction);
      registerMenuAction(openAction);
    }
  }, [editorContext?.editorStates.isCommandViewerOpen]);

  return <NavMenuDropdown category="View" menuActions={menuActions} />;
}
