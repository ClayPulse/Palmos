import { useContext } from "react";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { AppViewConfig, CanvasViewConfig, Extension, TabView } from "../types";
import { IMCContext } from "@/components/providers/imc-provider";

export function useTabViewManager() {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  function selectTab(newIndex: number) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => ({
      ...prev,
      tabIndex: newIndex,
    }));
  }

  function openFileInView(viewId: string, file: File, viewMode: ViewModeEnum) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    const installedApp = getInstalledAppByFileSuffix(
      file.name.split(".").pop() || "",
    );
    if (!installedApp) {
      throw new Error(
        `No compatible app found for file type: ${file.name.split(".").pop()}`,
      );
    }

    if (viewMode === ViewModeEnum.App) {
      // Find in the tabs if this app is opened
      const existingAppTab = editorContext.editorStates.tabViews.find(
        (view) =>
          view.type === ViewModeEnum.App &&
          (view.config as AppViewConfig).app === installedApp.config.id &&
          file.name === (view.config as AppViewConfig).fileUri,
      );

      const existingAppConfig = existingAppTab?.config as AppViewConfig;

      // If the app is opened and the file is the same, just switch to that tab
      if (existingAppConfig) {
        const existingTabIndex = editorContext.editorStates.tabViews.findIndex(
          (view) => view === existingAppTab,
        );
        selectTab(existingTabIndex);
        return;
      }

      // Create a new tab for the app with the file
      createTabView(ViewModeEnum.App, {
        viewId,
        app: installedApp.config.id,
        fileUri: file.name,
      } as AppViewConfig);
    } else if (viewMode === ViewModeEnum.Canvas) {
      // Find in the canvas if this app is opened
      const currentTab =
        editorContext.editorStates.tabViews[
          editorContext.editorStates.tabIndex
        ];

      if (currentTab?.type !== ViewModeEnum.Canvas) {
        throw new Error("Current tab is not a canvas");
      }

      const existingAppConfig = (
        currentTab.config as CanvasViewConfig
      ).appConfigs?.find(
        (appConfig) =>
          appConfig.app === installedApp.config.id &&
          appConfig.fileUri === file.name,
      );

      // If the app is opened and the file is the same, just move to that app in the canvas
      if (existingAppConfig) {
        // TODO: Move to that app in the canvas
        return;
      }

      // Add the app with the file to the current canvas
      const newAppConfig: AppViewConfig = {
        viewId,
        app: installedApp.config.id,
        fileUri: file.name,
      };
      const newCanvasConfig: CanvasViewConfig = {
        ...currentTab.config,
        appConfigs: [
          ...((currentTab.config as CanvasViewConfig).appConfigs ?? []),
          newAppConfig,
        ],
      };

      editorContext.setEditorStates((prev) => {
        const newViews = [...prev.tabViews];
        newViews[prev.tabIndex] = {
          ...currentTab,
          config: newCanvasConfig,
        };
        return {
          ...prev,
          tabViews: newViews,
        };
      });
    }
  }

  function getInstalledAppByFileSuffix(suffix: string): Extension | undefined {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    // Look for a compatible app in the installed apps
    return editorContext.persistSettings?.defaultFileTypeExtensionMap?.[suffix];
  }

  function closeView(view: TabView) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    const viewIdx = editorContext.editorStates.tabViews.findIndex(
      (v) => v === view,
    );
    if (viewIdx === -1) {
      return;
    }

    editorContext.setEditorStates((prev) => {
      const newViews = prev.tabViews.filter((v) => v !== view);
      const newIdx = Math.min(prev.tabIndex, newViews.length - 1);
      return {
        ...prev,
        tabViews: newViews,
        tabIndex: newIdx,
      };
    });
  }

  /**
   * Clear all views
   */
  function closeAllViews() {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        tabViews: [],
        tabIndex: -1,
      };
    });
  }

  function viewCount(): number {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    return editorContext.editorStates.tabViews.length;
  }

  async function createTabView(
    type: ViewModeEnum,
    config: AppViewConfig | CanvasViewConfig,
  ) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    } else if (!imcContext) {
      throw new Error("IMC context is not available");
    }
    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        tabViews: [
          ...prev.tabViews,
          {
            viewId: config.viewId,
            type,
            config,
          },
        ],
        tabIndex: prev.tabViews.length,
      };
    });

    await imcContext.resolveWhenViewInitialized(config.viewId);
    console.log("App view created:", config.viewId);
  }

  async function createAppViewInCanvasView(appConfig: AppViewConfig) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    const currentTab =
      editorContext.editorStates.tabViews[editorContext.editorStates.tabIndex];
    if (currentTab?.type !== ViewModeEnum.Canvas) {
      throw new Error("Current tab is not a canvas");
    }
    const newCanvasConfig: CanvasViewConfig = {
      ...currentTab.config,
      appConfigs: [
        ...((currentTab.config as CanvasViewConfig).appConfigs ?? []),
        appConfig,
      ],
    };
    editorContext.setEditorStates((prev) => {
      const newViews = [...prev.tabViews];
      newViews[prev.tabIndex] = {
        ...currentTab,
        config: newCanvasConfig,
      };
      return {
        ...prev,
        tabViews: newViews,
      };
    });

    await imcContext?.resolveWhenViewInitialized(appConfig.viewId);
  }

  function getId(nameOrUrl: string) {
    try {
      const url = new URL(nameOrUrl);
      const parts = url.pathname.split("/").filter((part) => part.length > 0);
      const id = parts[parts.length - 2];
      return id;
    } catch {
      return nameOrUrl;
    }
  }

  function isAppNameMatched(a: string, b: string) {
    const aId = getId(a);
    const bId = getId(b);
    return aId === bId;
  }

  function findAppInTabView(appId: string): AppViewConfig | undefined {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    const activeTabView =
      editorContext?.editorStates.tabViews[
        editorContext?.editorStates.tabIndex
      ];

    console.log("Finding app in tab views:", appId);
    console.log(
      "Active tab view:",
      activeTabView,
      editorContext?.editorStates.tabViews,
      editorContext?.editorStates.tabIndex,
    );

    if (activeTabView?.type === ViewModeEnum.App) {
      const config = activeTabView.config as AppViewConfig;
      return isAppNameMatched(config.app, appId) ? config : undefined;
    } else if (activeTabView?.type === ViewModeEnum.Canvas) {
      const canvasView = activeTabView.config as CanvasViewConfig;

      // Throw an error if multiple instances of the same app are found
      const appInstances = canvasView.appConfigs?.filter((app) =>
        isAppNameMatched(app.app, appId),
      );
      if ((appInstances?.length ?? 0) > 1) {
        throw new Error("Multiple instances of the same app found in canvas");
      }
      const appInstance = appInstances?.[0];
      return appInstance;
    }

    return undefined;
  }

  return {
    tabViews: editorContext?.editorStates.tabViews ?? [],
    tabIndex: editorContext?.editorStates.tabIndex ?? -1,
    activeTabView:
      editorContext?.editorStates.tabViews[
        editorContext?.editorStates.tabIndex
      ],
    selectTab,
    viewCount,
    openFileInView,
    closeView,
    closeAllViews,
    createTabView,
    createAppViewInCanvasView,
    findAppInTabView,
  };
}
