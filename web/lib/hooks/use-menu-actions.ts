import { useContext } from "react";
import { MenuAction } from "../types";
import { EditorContext } from "@/components/providers/editor-context-provider";

export function useMenuActions() {
  const editorContext = useContext(EditorContext);

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
    menuActions: editorContext?.editorStates.menuActions,
    registerMenuAction,
  };
}
