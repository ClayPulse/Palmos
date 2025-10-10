import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect } from "react";
import { MenuAction } from "../../types";

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
  
  useEffect(() => {
    return () => {
      unregisterMenuAction(actionInfo.name);
    };
  }, []);

  useEffect(() => {
    if (!editorContext) {
      return;
    }
    if (isEnabled) {
      registerMenuAction({
        name: actionInfo.name,
        menuCategory: actionInfo.menuCategory as "file" | "edit" | "view",
        shortcut: actionInfo.shortcut,
        description: actionInfo.description,
        icon: actionInfo.icon,
        actionFunc: callbackHandler,
      });
    } else {
      unregisterMenuAction(actionInfo.name);
    }

    return () => {
      unregisterMenuAction(actionInfo.name);
    };
  }, [...deps, isEnabled]);

  function registerMenuAction(action: MenuAction) {
    if (!editorContext) {
      return;
    }
    editorContext.setEditorStates((prev) => {
      const existingAction =
        prev.menuActions?.find((a) => a.name === action.name) ?? undefined;
      // Update action if it already exists
      if (existingAction) {
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

  function unregisterMenuAction(actionName: string) {
    if (!editorContext) {
      return;
    }
    editorContext.setEditorStates((prev) => {
      const existingActions = prev.menuActions || [];
      return {
        ...prev,
        menuActions: existingActions.filter((a) => a.name !== actionName),
      };
    });
  }
}
