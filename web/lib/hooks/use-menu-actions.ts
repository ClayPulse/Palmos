import { useContext } from "react";
import { MenuAction } from "../types";
import { EditorContext } from "@/components/providers/editor-context-provider";

export function useMenuActions(type?: string) {
  const editorContext = useContext(EditorContext);

  const menuActions = editorContext?.editorStates.menuActions;

  async function registerMenuAction(action: MenuAction) {
    if (!editorContext) {
      return;
    }
    editorContext.setEditorStates((prev) => {
      const existingActions = prev.menuActions || [];
      // Avoid registering duplicate actions with the same name
      if (existingActions.find((a) => a.name === action.name)) {
        return prev;
      }
      return {
        ...prev,
        menuActions: [...existingActions, action],
      };
    });
  }

  return {
    menuActions: type
      ? menuActions?.filter((action) => action.menuCategory === type)
      : menuActions,
    registerMenuAction,
  };
}
