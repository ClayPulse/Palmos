import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import { v4 } from "uuid";
import {
  AppViewConfig,
  CanvasViewConfig,
  Extension,
  MenuAction,
  TabView,
} from "../types";
import { useMenuActions } from "./use-menu-actions";

export function useTabViewManager() {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);
  const { registerMenuAction, unregisterMenuAction } = useMenuActions();

  const [tabViews, setTabViews] = useState<TabView[]>(
    editorContext?.editorStates.tabViews ?? [],
  );
  const [tabIndex, setTabIndex] = useState<number>(
    editorContext?.editorStates.tabIndex ?? -1,
  );
  const [activeTabView, setActiveTabView] = useState<TabView | undefined>(
    tabViews[tabIndex],
  );

  useEffect(() => {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    setTabViews(editorContext.editorStates.tabViews);
    setTabIndex(editorContext.editorStates.tabIndex);
    setActiveTabView(
      editorContext?.editorStates.tabViews[
        editorContext?.editorStates.tabIndex
      ],
    );
  }, [
    editorContext?.editorStates.tabViews,
    editorContext?.editorStates.tabIndex,
  ]);

  useEffect(() => {
    const action: MenuAction = {
      name: "Close Workflow",
      actionFunc: async () => {
        if (activeTabView) {
          closeTabView(activeTabView);
        }
      },
      menuCategory: "file",
      shortcut: "Ctrl+C",
      icon: "close",
      description: "Close the current workflow",
    };
    if ((tabViews.length ?? 0) > 0) {
      // Register the action if there are tab views open
      registerMenuAction(action, true);
    } else {
      // Unregister the action if no tab views are open
      unregisterMenuAction(action);
    }
  }, [tabViews, activeTabView]);

  function selectTab(newIndex: number) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => ({
      ...prev,
      tabIndex: newIndex,
    }));
  }

  async function openFileInView(
    viewId: string,
    file: File,
    viewMode: ViewModeEnum,
  ) {
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
      await createTabView(ViewModeEnum.App, {
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
      ).nodes?.find(
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
        recommendedHeight: installedApp.config.recommendedHeight,
        recommendedWidth: installedApp.config.recommendedWidth,
      };
      const newCanvasConfig: CanvasViewConfig = {
        ...currentTab.config,
        nodes: [
          ...((currentTab.config as CanvasViewConfig).nodes ?? []),
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

  function closeTabView(view: TabView) {
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
  function closeAllTabViews() {
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

    const newTabView: TabView = {
      type,
      config,
    };

    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        tabViews: [...prev.tabViews, newTabView],
        tabIndex: prev.tabViews.length,
      };
    });

    if (type === ViewModeEnum.App) {
      // Wait for app view to be initialized. This is because unlike canvas views,
      // app views need to load the app first before it can render the view.
      await imcContext.resolveWhenViewInitialized(config.viewId);
    } else if (type === ViewModeEnum.Canvas) {
      // Open explorer for canvas views
      editorContext.setEditorStates((prev) => ({
        ...prev,
        isSideMenuOpen: true,
      }));
    }

    return newTabView;
  }

  async function createAppViewInCanvasView(appConfig: AppViewConfig) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    let currentTab = activeTabView;

    if (!currentTab) {
      currentTab = await createTabView(ViewModeEnum.Canvas, {
        viewId: `canvas-${v4()}`,
      } as CanvasViewConfig);
    } else if (currentTab?.type !== ViewModeEnum.Canvas) {
      currentTab = await createTabView(ViewModeEnum.Canvas, {
        viewId: `canvas-${v4()}`,
      } as CanvasViewConfig);
    }

    const newCanvasConfig: CanvasViewConfig = {
      ...currentTab.config,
      nodes: [
        ...((currentTab.config as CanvasViewConfig).nodes ?? []),
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

  async function deleteAppViewInCanvasView(viewId: string) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    const currentTab = activeTabView;
    if (currentTab?.type !== ViewModeEnum.Canvas) {
      throw new Error("Current tab is not a canvas");
    }

    const newCanvasConfig: CanvasViewConfig = {
      ...currentTab.config,
      nodes: (currentTab.config as CanvasViewConfig).nodes?.filter(
        (config) => config.viewId !== viewId,
      ),
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

    if (activeTabView?.type === ViewModeEnum.App) {
      const config = activeTabView.config as AppViewConfig;
      return isAppNameMatched(config.app, appId) ? config : undefined;
    } else if (activeTabView?.type === ViewModeEnum.Canvas) {
      const canvasView = activeTabView.config as CanvasViewConfig;

      // Throw an error if multiple instances of the same app are found
      console.log(
        "Searching for app in canvas:",
        appId,
        canvasView,
        activeTabView,
      );
      const appInstances = canvasView.nodes?.filter((app) =>
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
    tabViews,
    tabIndex,
    activeTabView,
    selectTab,
    viewCount,
    openFileInView,
    closeTabView,
    closeAllTabViews,
    createTabView,
    createAppViewInCanvasView,
    deleteAppViewInCanvasView,
    findAppInTabView,
  };
}
