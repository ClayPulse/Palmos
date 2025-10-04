import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import {
  Action,
  IMCMessageTypeEnum,
  ViewModeEnum,
} from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import { ExtensionApp, ScopedAction } from "../types";
import { useMenuActions } from "./use-menu-actions";
import { useTabViewManager } from "./use-tab-view-manager";

/**
 *  Use actions in active tab.
 *  This hook provides actions from the active tab
 *  view and static actions from all installed apps.
 */
export default function useScopedActions() {
  const imcContext = useContext(IMCContext);
  const editorContext = useContext(EditorContext);

  const {
    activeTabView,
    createTabView,
    createAppViewInCanvasView,
    findAppInTabView,
  } = useTabViewManager();
  const { menuActions } = useMenuActions();

  const [actions, setActions] = useState<ScopedAction[]>([]);

  const [keyword, setKeyword] = useState<string | undefined>(undefined);

  // Editor built-in actions
  const editorActions: Action[] = [
    {
      name: "New Workflow",
      description: "Create a new blank Workflow",
      parameters: {},
      returns: {},
      handler: async (args: any) => {
        // Implementation of creating a new workflow
        menuActions?.find((a) => a.name === "New Workflow")?.actionFunc();
        return { success: true };
      },
    },
    {
      name: "Open File",
      description: "Open a file in a new tab",
      parameters: {
        filePath: {
          type: "string",
          description: "Path to the file to open",
        },
      },
      returns: {},
      handler: async (args: any) => {
        // Implementation of opening a file
        console.log("Opening file with args:", args);
        return { success: true };
      },
    },
  ];

  // Update editor actions
  useEffect(() => {
    if (keyword) {
      const newEditorActions = editorActions
        .filter((action) =>
          action.name.toLowerCase().includes(keyword.toLowerCase().trim()),
        )
        .map((action) => ({
          type: "editor" as const,
          action,
        }));

      setActions((prev) => [
        ...prev.filter((c) => c.type !== "editor"),
        ...newEditorActions,
      ]);
    }
  }, [keyword]);

  // Update static actions when new apps are installed or removed
  useEffect(() => {
    const apps = editorContext?.persistSettings?.extensions ?? [];
    const preRegisteredAppActions: ScopedAction[] = apps.flatMap((ext) =>
      getPreRegisteredAppActions(ext, keyword).map((action) => ({
        type: "app" as const,
        action: action,
      })),
    );

    console.log("Found static app actions:", preRegisteredAppActions);

    setActions((prev) => [
      ...prev.filter((c) => c.type !== "app"),
      ...preRegisteredAppActions,
    ]);
  }, [editorContext?.persistSettings?.extensions, keyword]);

  async function runAction(action: ScopedAction, args: any) {
    console.log(`Running action "${action.action.name}"`);
    if (action.type === "editor") {
      const editorAction = editorActions.find(
        (cmd) => cmd.name === action.action.name,
      );

      if (!editorAction) {
        toast.error(`Editor action not found: ${action.action.name}`);
        return;
      } else if (!editorAction.handler) {
        toast.error(`Editor action has no handler: ${action.action.name}`);
        return;
      }

      const result = await editorAction.handler(args);

      return result;
    } else if (action.type === "app") {
      const extensions = editorContext?.persistSettings?.extensions ?? [];
      const ext = extensions.find((e) =>
        (e.config.preRegisteredActions ?? []).some(
          (act) => act.name === action.action.name,
        ),
      );

      if (!ext) {
        toast.error(`Extension not found for Action: ${action.action.name}`);
        return;
      }

      const appInView = findAppInTabView(ext.config.id);

      console.log("App in view for static Action:", appInView);

      if (appInView) {
        // App is already in the view, execute Action in the app's context.
        const result = await imcContext?.polyIMC?.sendMessage(
          ext.config.id + "-" + appInView.viewId,
          IMCMessageTypeEnum.EditorRunAppAction,
          { name: action.action.name, args },
        );
        return result;
      } else {
        // Create an instance of the app that provides the static Action,
        // then execute Action in the app's context.
        const viewId = v4();
        if (activeTabView?.type === ViewModeEnum.Canvas) {
          await createAppViewInCanvasView({
            app: ext.config.id,
            viewId,
            recommendedHeight: ext.config.recommendedHeight,
            recommendedWidth: ext.config.recommendedWidth,
          });
        } else {
          await createTabView(ViewModeEnum.App, {
            app: ext.config.id,
            viewId,
          });
        }

        console.log("App is ready");

        // Wait for the action to be ready
        await waitForActionReady(action);

        const result = await imcContext?.polyIMC?.sendMessage(
          ext.config.id + "-" + viewId,
          IMCMessageTypeEnum.EditorRunAppAction,
          { name: action.action.name, args },
        );
        return result;
      }
    }
  }

  function getPreRegisteredAppActions(
    extension: ExtensionApp,
    keyword?: string,
  ) {
    const actions = extension.config.preRegisteredActions ?? [];
    if (keyword) {
      return actions.filter((action) =>
        action.name.toLowerCase().includes(keyword.toLowerCase().trim()),
      );
    }
    return actions;
  }

  function setKeywordFilter(newKeyword: string | undefined) {
    setKeyword(newKeyword);
  }

  async function waitForActionReady(action: ScopedAction) {
    await imcContext?.resolveWhenActionRegistered(action.action);
    console.log(`Action "${action.action.name}" is ready.`);
  }

  return {
    runAction,
    actions,
    setKeywordFilter,
  };
}
