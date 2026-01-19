import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import { addToast } from "@heroui/react";
import {
  Action,
  IMCMessageTypeEnum,
  ViewModeEnum,
} from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import { ExtensionApp, ScopedAction } from "../types";
import { useMenuActions } from "./menu-actions/use-menu-actions";
import { useTabViewManager } from "./use-tab-view-manager";

/**
 *  Use actions in active tab.
 *  This hook provides actions from the active tab
 *  view and static actions from all installed apps.
 */
export default function useActionExecutor(appName?: string) {
  const imcContext = useContext(IMCContext);
  const editorContext = useContext(EditorContext);

  const {
    activeTabView,
    createAppTabView,
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
    if (keyword && !appName) {
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
  }, [keyword, appName]);

  // Update pre-registered actions when new apps are installed or removed
  useEffect(() => {
    function getApp(appName: string) {
      const app = editorContext?.persistSettings?.extensions?.find(
        (ext) => ext.config.id === appName,
      );

      return app ? [app] : [];
    }

    const apps = appName
      ? getApp(appName)
      : (editorContext?.persistSettings?.extensions ?? []);
    const preRegisteredAppActions: ScopedAction[] = apps.flatMap((ext) =>
      getPreRegisteredAppActions(ext, keyword).map((action) => ({
        type: "app" as const,
        action: action,
      })),
    );

    console.log("Found pre-registered app actions:", preRegisteredAppActions);

    setActions((prev) => [
      ...prev.filter((c) => c.type !== "app"),
      ...preRegisteredAppActions,
    ]);
  }, [editorContext?.persistSettings?.extensions, keyword, appName]);

  async function runScopedAction(action: ScopedAction, args: any) {
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

      const appInView = findAppInTabView(ext.config.id, action.viewId);

      console.log("App in view for static Action:", appInView);

      if (appInView) {
        // App is already in the view, execute Action in the app's context.

        // Attach app's app-instance inputs, as these won't be entered via command action
        // Find if these params are already provided in args in react flow workflow
        const nodeId = appInView.viewId;

        const node = editorContext?.editorStates?.workflowNodes.find(
          (n) => n.id === nodeId,
        );

        const appInstanceArgs = node?.data.ownedAppViews || {};

        const finalArgs = {
          ...args,
          ...appInstanceArgs,
        };

        const result =
          (await imcContext?.polyIMC?.sendMessage(
            appInView.viewId,
            IMCMessageTypeEnum.EditorRunAppAction,
            {
              name: action.action.name,
              args: finalArgs,
            },
          )) ?? [];

        if (result?.length !== 1) {
          addToast({
            title: `Unexpected result when running action "${action.action.name}"`,
            description: `Expected single result but got ${result?.length} results.`,
            color: "warning",
          });
        }
        return result[0];
      } else {
        // Create an instance of the app that provides the static Action,
        // then execute Action in the app's context.
        const viewId = `${ext.config.id}-${v4()}`;
        if (activeTabView?.type === ViewModeEnum.Canvas) {
          await createAppViewInCanvasView({
            app: ext.config.id,
            viewId,
            initialHeight: ext.config.recommendedHeight,
            initialWidth: ext.config.recommendedWidth,
          });
        } else {
          await createAppTabView({
            app: ext.config.id,
            viewId,
          });
        }

        console.log("App is ready");

        // Wait for the action to be ready
        await waitForActionReady(action);

        // App is already in the view, execute Action in the app's context.
        const result =
          (await imcContext?.polyIMC?.sendMessage(
            viewId,
            IMCMessageTypeEnum.EditorRunAppAction,
            { name: action.action.name, args },
          )) ?? [];

        if (result?.length !== 1) {
          addToast({
            title: `Unexpected result when running action "${action.action.name}"`,
            description: `Expected single result but got ${result?.length} results.`,
            color: "warning",
          });
        }
        return result[0];
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
    runScopedAction,
    actions,
    setKeywordFilter,
  };
}
