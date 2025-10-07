import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useState } from "react";
import { MenuAction } from "../types";

export function useRegisterMenuAction(
  actionInfo: {
    name: string;
    menuCategory: string;
    shortcut?: string;
    description?: string;
    icon?: string;
  },
  callbackHandler: () => Promise<void>,
  deps: React.DependencyList,
  isEnabled = true,
) {
  const editorContext = useContext(EditorContext);

  const [menuAction, setMenuAction] = useState<MenuAction>({
    name: actionInfo.name,
    menuCategory: actionInfo.menuCategory as "file" | "edit" | "view",
    shortcut: actionInfo.shortcut,
    description: actionInfo.description,
    icon: actionInfo.icon,
    actionFunc: callbackHandler,
  });

  useEffect(() => {
    return () => {
      unregisterMenuAction(menuAction);
    };
  }, []);

  useEffect(() => {
    if (isEnabled) {
      registerMenuAction(menuAction, true);
    } else {
      unregisterMenuAction(menuAction);
    }
  }, [menuAction, isEnabled]);

  useEffect(() => {
    if (!editorContext) {
      return;
    }

    setMenuAction({
      name: actionInfo.name,
      menuCategory: actionInfo.menuCategory as "file" | "edit" | "view",
      shortcut: actionInfo.shortcut,
      description: actionInfo.description,
      icon: actionInfo.icon,
      actionFunc: callbackHandler,
    });
  }, [...deps]);

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
}
