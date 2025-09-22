import { IMCContext } from "@/components/providers/imc-provider";
import {
  CommandDefinition,
  IMCMessageTypeEnum,
  ViewModeEnum,
} from "@pulse-editor/shared-utils";
import { use, useContext, useEffect, useState } from "react";
import {
  AppViewConfig,
  Command,
  CanvasViewConfig,
  Extension,
  TabView,
} from "../types";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useTabViewManager } from "./use-tab-view-manager";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import { useMenuActions } from "./use-menu-actions";

/**
 *  Use commands in active tab.
 *  This hook provides commands from the active tab
 *  view and static commands from all installed apps.
 */
export default function useCommands() {
  const imcContext = useContext(IMCContext);
  const editorContext = useContext(EditorContext);

  const {
    activeTabView,
    createTabView,
    createAppViewInCanvasView,
    findAppInTabView,
  } = useTabViewManager();
  const { menuActions } = useMenuActions();

  const [commands, setCommands] = useState<Command[]>([]);

  const [keyword, setKeyword] = useState<string | undefined>(undefined);

  // Editor built-in commands
  const editorCommands: CommandDefinition[] = [
    {
      info: {
        name: "New Workflow",
        description: "Create a new blank Workflow",
        parameters: {},
      },
      handler: async (args: any) => {
        // Implementation of creating a new workflow
        menuActions?.find((a) => a.name === "New Workflow")?.actionFunc();
        return { success: true };
      }
    },
    {
      info: {
        name: "Open File",
        description: "Open a file in a new tab",
        parameters: {
          filePath: {
            type: "string",
            description: "Path to the file to open",
          },
        },
      },
      handler: async (args: any) => {
        // Implementation of opening a file
        console.log("Opening file with args:", args);
        return { success: true };
      },
    },
  ];

  // Update editor commands
  useEffect(() => {
    const newEditorCommands = editorCommands.map((cmd) => ({
      type: "editor" as const,
      commandInfo: cmd.info,
    }));
    setCommands((prev) => [
      ...prev.filter((c) => c.type !== "editor"),
      ...(keyword
        ? newEditorCommands.filter((cmd) =>
            cmd.commandInfo.name
              .toLowerCase()
              .includes(keyword.toLowerCase().trim()),
          )
        : newEditorCommands),
    ]);
  }, [keyword]);

  // Update static commands when new apps are installed or removed
  useEffect(() => {
    const extensions = editorContext?.persistSettings?.extensions ?? [];
    const staticCommands = extensions.flatMap((ext) =>
      getStaticAppCommands(ext, keyword).map((cmd) => ({
        type: "static" as const,
        commandInfo: cmd,
      })),
    );

    console.log("Found static commands:", staticCommands);

    setCommands((prev) => [
      ...prev.filter((c) => c.type !== "static"),
      ...staticCommands,
    ]);
  }, [editorContext?.persistSettings?.extensions, keyword]);

  // Update dynamic commands when views are added or removed
  useEffect(() => {
    const viewCommands = activeTabView
      ? getViewDynamicCommands(activeTabView, keyword).map((cmd) => ({
          type: "dynamic" as const,
          commandInfo: cmd,
        }))
      : [];

    setCommands((prev) => [
      ...prev.filter((c) => c.type !== "dynamic"),
      ...viewCommands,
    ]);
  }, [activeTabView, keyword]);

  async function runCommand(command: Command, args: any) {
    console.log(`Running command "${command.commandInfo.name}"`);
    if (command.type === "editor") {
      const cmdDef = editorCommands.find(
        (cmd) => cmd.info.name === command.commandInfo.name,
      );

      if (!cmdDef) {
        toast.error(`Editor command not found: ${command.commandInfo.name}`);
        return;
      }

      const result = await cmdDef.handler(args);

      return result;
    } else if (command.type === "static") {
      const extensions = editorContext?.persistSettings?.extensions ?? [];
      const ext = extensions.find((e) =>
        (e.config.commandsInfoList ?? []).some(
          (cmd) => cmd.name === command.commandInfo.name,
        ),
      );

      if (!ext) {
        toast.error(
          `Extension not found for command: ${command.commandInfo.name}`,
        );
        return;
      }

      const appInView = findAppInTabView(ext.config.id);

      if (appInView) {
        // App is already in the view, execute command in the app's context.
        imcContext?.polyIMC?.sendMessage(
          ext.config.id + "-" + appInView.viewId,
          IMCMessageTypeEnum.EditorRunExtCommand,
          { name: command.commandInfo.name, args },
        );
      } else {
        // Create an instance of the app that provides the static command,
        // then execute command in the app's context.
        const viewId = v4();
        if (activeTabView?.type === ViewModeEnum.Canvas) {
          await createAppViewInCanvasView({
            app: ext.config.id,
            viewId,
          });
        } else {
          await createTabView(ViewModeEnum.App, {
            app: ext.config.id,
            viewId,
          });
        }

        imcContext?.polyIMC?.sendMessage(
          ext.config.id + "-" + viewId,
          IMCMessageTypeEnum.EditorRunExtCommand,
          { name: command.commandInfo.name, args },
        );
      }
    } else if (command.type === "dynamic") {
      if (!command.viewId) {
        throw new Error("View ID is required for view commands");
      }

      imcContext?.polyIMC?.sendMessage(
        command.viewId,
        IMCMessageTypeEnum.EditorRunExtCommand,
        { name: command.commandInfo.name, args },
      );
    }
  }

  function getStaticAppCommands(extension: Extension, keyword?: string) {
    const commands = extension.config.commandsInfoList ?? [];
    if (keyword) {
      return commands.filter((cmd) =>
        cmd.name.toLowerCase().includes(keyword.toLowerCase().trim()),
      );
    }
    return commands;
  }

  function getAppViewDynamicCommands(appView: AppViewConfig, keyword?: string) {
    const commands = appView.dynamicCommands ?? [];
    if (keyword) {
      return (
        commands.filter((cmd) =>
          cmd.name.toLowerCase().includes(keyword.toLowerCase().trim()),
        ) ?? []
      );
    }
    return commands;
  }

  function getViewDynamicCommands(view: TabView, keyword?: string) {
    if (view.type === ViewModeEnum.App) {
      return getAppViewDynamicCommands(view.config as AppViewConfig, keyword);
    } else if (view.type === ViewModeEnum.Canvas) {
      const canvasView = view.config as CanvasViewConfig;
      // Get all available apps' commands in the canvas
      const appCommands = canvasView.appConfigs?.flatMap((appConfig) =>
        getAppViewDynamicCommands(appConfig, keyword),
      );
      return appCommands ?? [];
    }
    return [];
  }

  function setKeywordFilter(newKeyword: string | undefined) {
    setKeyword(newKeyword);
  }

  return {
    runCommand,
    commands,
    setKeywordFilter,
  };
}
