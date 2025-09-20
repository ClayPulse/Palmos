import { useContext } from "react";
import { MenuAction } from "../types";
import { EditorContext } from "@/components/providers/editor-context-provider";

export function useMenuActions(type?: string) {
  const editorContext = useContext(EditorContext);

  const menuActions = editorContext?.editorStates.menuActions;

  async function registerMenuAction(action: MenuAction, overwrite = false) {
    if (!editorContext) {
      return;
    }
    editorContext.setEditorStates((prev) => {
      const existingAction =
        prev.menuActions?.find((a) => a.name === action.name) ?? undefined;
      // Update action if it already exists
      if (existingAction) {
        if (!overwrite) {
          console.warn(
            `Menu action with name "${action.name}" already exists. Use overwrite=true to replace it.`,
          );
          return prev;
        }
        const updatedActions = prev.menuActions?.map((a) =>
          a.name === action.name ? action : a,
        );
        return {
          ...prev,
          menuActions: updatedActions,
        };
      }
      return {
        ...prev,
        menuActions: [...(prev.menuActions ?? []), action],
      };
    });
  }

  async function unregisterMenuAction(action: MenuAction) {
    if (!editorContext) {
      return;
    }
    editorContext.setEditorStates((prev) => {
      const existingActions = prev.menuActions || [];
      return {
        ...prev,
        menuActions: existingActions.filter((a) => a.name !== action.name),
      };
    });
  }

  return {
    menuActions: type
      ? menuActions?.filter((action) => action.menuCategory === type)
      : menuActions,
    registerMenuAction,
    unregisterMenuAction,
  };
}
