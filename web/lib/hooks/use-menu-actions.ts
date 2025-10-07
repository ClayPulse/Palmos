import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext } from "react";
import { MenuAction } from "../types";

export function useMenuActions(type?: string) {
  const editorContext = useContext(EditorContext);

  const menuActions = editorContext?.editorStates.menuActions;

  async function runMenuActionByKeyboardShortcut(event: KeyboardEvent) {
    const action = menuActions?.find((action) => {
      if (action.shortcut) {
        // Parse shortcut like "Ctrl+Shift+X"
        const keys = action.shortcut
          .toLowerCase()
          .split("+")
          .map((k) => k.trim());
        const ctrl = keys.includes("ctrl") || keys.includes("cmd");
        const shift = keys.includes("shift");
        const alt = keys.includes("alt");
        const key = keys.find(
          (k) => !["ctrl", "cmd", "shift", "alt"].includes(k),
        );
        if (
          (ctrl ? event.ctrlKey || event.metaKey : true) &&
          (shift ? event.shiftKey : true) &&
          (alt ? event.altKey : true) &&
          event.key.toLowerCase() === key
        ) {
          return true;
        }
      }
      return false;
    });

    if (action) {
      event.preventDefault();
      await action.actionFunc();
    }
  }

  async function runMenuActionByName(name: string, category: string) {
    const action = menuActions?.find(
      (action) => action.name === name && action.menuCategory === category,
    );
    if (action) {
      await action.actionFunc();
    }
  }

  function registerMenuAction(action: MenuAction, overwrite = false) {
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

  function unregisterMenuAction(action: MenuAction) {
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
    runMenuActionByKeyboardShortcut,
    runMenuActionByName,
  };
}
