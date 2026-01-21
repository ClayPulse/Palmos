import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import { addToast, Button } from "@heroui/react";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import { PlatformEnum, SideMenuTabEnum } from "../enums";
import { getPlatform } from "../platform-api/platform-checker";
import {
  AppViewConfig,
  CanvasViewConfig,
  ExtensionApp,
  TabView,
} from "../types";
import { createAppViewId, createCanvasViewId } from "../views/view-helpers";
import useRouter from "./use-router";
import { useScreenSize } from "./use-screen-size";

export function useTabViewManager() {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const { isLandscape } = useScreenSize();
  const router = useRouter();

  const [tabViews, setTabViews] = useState<TabView[]>(
    editorContext?.editorStates.tabViews ?? [],
  );
  const [tabIndex, setTabIndex] = useState<number>(
    editorContext?.editorStates.tabIndex ?? -1,
  );
  const [activeTabView, setActiveTabView] = useState<TabView | undefined>(
    tabViews[tabIndex],
  );

  const [isCreatingTab, setIsCreatingTab] = useState<boolean>(true);

  // Generate tab names with index suffixes for duplicates
  const nameCounts: Record<string, number> = {};
  tabViews.forEach((view) => {
    const baseName =
      view.type === ViewModeEnum.App
        ? (view.config as AppViewConfig).app
        : "Canvas";
    nameCounts[baseName] = (nameCounts[baseName] ?? 0) + 1;
  });

  const nameIndexes: Record<string, number> = {};
  const tabItems =
    tabViews.map((view) => {
      const baseName =
        view.type === ViewModeEnum.App
          ? (view.config as AppViewConfig).app
          : "Canvas";
      nameIndexes[baseName] = (nameIndexes[baseName] ?? 0) + 1;
      const count = nameCounts[baseName];
      const index = nameIndexes[baseName];
      return {
        name: count > 1 ? `${baseName} ${index}` : baseName,
        description:
          view.type === ViewModeEnum.App
            ? `App: ${(view.config as AppViewConfig).app}`
            : "Canvas View",
      };
    }) ?? [];

  useEffect(() => {
    // set isCreatingTab to false after 1 second so that initial tab creation does not trigger URL update
    const timer = setTimeout(() => {
      setIsCreatingTab(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Update local states when editor context changes
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

  // Pend workflow or app param when tab index changes
  useEffect(() => {
    if (isCreatingTab) return;

    if (activeTabView) {
      if (activeTabView.type === ViewModeEnum.App) {
        const appConfig = activeTabView.config as AppViewConfig;
        router.replace(`/?app=${appConfig.app}`);
      } else if (activeTabView.type === ViewModeEnum.Canvas) {
        const canvasConfig = activeTabView.config as CanvasViewConfig;
        router.replace(`/?workflow=${canvasConfig.viewId}`);
      }
    } else {
      router.replace(`/`);
    }
  }, [activeTabView, isCreatingTab]);

  function selectTab(newIndex: number) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => ({
      ...prev,
      tabIndex: newIndex,
    }));
  }

  async function openFileInView(file: File, viewMode: ViewModeEnum) {
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
      await createAppTabView({
        viewId: createAppViewId(installedApp.config.id),
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
        viewId: createAppViewId(installedApp.config.id),
        app: installedApp.config.id,
        fileUri: file.name,
        initialHeight: installedApp.config.recommendedHeight,
        initialWidth: installedApp.config.recommendedWidth,
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

  function getInstalledAppByFileSuffix(
    suffix: string,
  ): ExtensionApp | undefined {
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

    if (view.type === ViewModeEnum.Canvas) {
      // Remove the app nodes' view IDs from IMC context
      (view.config as CanvasViewConfig).appConfigs?.forEach((appConfig) => {
        imcContext?.removeViewChannels(appConfig.viewId);
      });
    } else if (view.type === ViewModeEnum.App) {
      imcContext?.removeViewChannels((view.config as AppViewConfig).viewId);
    }
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

    // For all tab views, remove their view IDs from IMC context
    tabViews.forEach((view) => {
      if (view.type === ViewModeEnum.Canvas) {
        (view.config as CanvasViewConfig).appConfigs?.forEach((appConfig) => {
          imcContext?.removeViewChannels(appConfig.viewId);
        });
      } else if (view.type === ViewModeEnum.App) {
        imcContext?.removeViewChannels((view.config as AppViewConfig).viewId);
      }
    });
  }

  function viewCount(): number {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    return editorContext.editorStates.tabViews.length;
  }

  async function createAppTabView(appConfig: AppViewConfig) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    } else if (!imcContext) {
      throw new Error("IMC context is not available");
    }

    setIsCreatingTab(true);

    const newTabView: TabView = {
      type: ViewModeEnum.App,
      config: appConfig,
    };

    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        tabViews: [...prev.tabViews, newTabView],
        tabIndex: prev.tabViews.length,
      };
    });

    // Wait for app view to be initialized. This is because unlike canvas views,
    // app views need to load the app first before it can render the view.
    await imcContext.resolveWhenViewInitialized(appConfig.viewId);

    return newTabView;
  }

  async function createCanvasTabView(
    canvasConfig: CanvasViewConfig,
    openExplorer = true,
  ) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    } else if (!imcContext) {
      throw new Error("IMC context is not available");
    } else if (!editorContext.editorStates.project) {
      addToast({
        title: "Project Not Opened",
        description: `No project is opened.`,
        color: "danger",
        endContent: (
          <Button
            color="danger"
            size="sm"
            onPress={() => {
              editorContext?.setEditorStates((prev) => ({
                ...prev,
                isSideMenuOpen: true,
                modalStates: {
                  ...prev.modalStates,
                  marketplace: {
                    isOpen: false,
                  },
                },
              }));
            }}
          >
            Open Project
          </Button>
        ),
      });
      return undefined;
    }

    const requireWorkspace = canvasConfig.appConfigs
      ?.map((appConfig) => appConfig.app)
      .some((app) =>
        editorContext?.persistSettings?.extensions?.find(
          (ext) => ext.config.id === app && ext.config.requireWorkspace,
        ),
      );

    if (
      requireWorkspace &&
      !editorContext?.editorStates.currentWorkspace &&
      getPlatform() !== PlatformEnum.Electron
    ) {
      addToast({
        title: "Workspace Required",
        description: "This workflow requires a workspace to be opened.",
        color: "danger",
        endContent: (
          <Button
            color="danger"
            size="sm"
            onPress={() => {
              editorContext?.setEditorStates((prev) => ({
                ...prev,
                isSideMenuOpen: true,
                sideMenuTab: SideMenuTabEnum.Workspace,
                modalStates: {
                  ...prev.modalStates,
                  marketplace: {
                    isOpen: false,
                  },
                },
              }));
            }}
          >
            Configure
          </Button>
        ),
      });
      return undefined;
    }

    setIsCreatingTab(true);

    // Prohibit creating canvas if any app's view ID in the canvas already exists
    const existViewId = canvasConfig.appConfigs?.find((appConfig) =>
      imcContext?.polyIMC?.hasChannel(appConfig.viewId),
    );

    if (existViewId) {
      addToast({
        title: "Error creating canvas",
        description: `Same app nodes already exist. Your workflow might already be opened in another tab.`,
        color: "danger",
      });
      return undefined;
    }

    const newTabView: TabView = {
      type: ViewModeEnum.Canvas,
      config: canvasConfig,
    };

    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        tabViews: [...prev.tabViews, newTabView],
        tabIndex: prev.tabViews.length,
      };
    });

    // Open explorer for canvas views
    if (openExplorer) {
      editorContext.setEditorStates((prev) => ({
        ...prev,
        isSideMenuOpen: true,
      }));
    }

    // Close marketplace if open
    editorContext.setEditorStates((prev) => ({
      ...prev,
      modalStates: {
        ...prev.modalStates,
        marketplace: {
          isOpen: false,
        },
      },
    }));

    return newTabView;
  }

  async function createAppViewInCanvasView(appConfig: AppViewConfig) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    } else if (!editorContext.editorStates.project) {
      addToast({
        title: "Project Not Opened",
        description: `No project is opened.`,
        color: "danger",
        endContent: (
          <Button
            color="danger"
            size="sm"
            onPress={() => {
              editorContext?.setEditorStates((prev) => ({
                ...prev,
                isSideMenuOpen: true,
                modalStates: {
                  ...prev.modalStates,
                  marketplace: {
                    isOpen: false,
                  },
                },
              }));
            }}
          >
            Open Project
          </Button>
        ),
      });
      return;
    }

    const requireWorkspace = appConfig.app
      ? editorContext?.persistSettings?.extensions?.find(
          (ext) =>
            ext.config.id === appConfig.app && ext.config.requireWorkspace,
        )
      : false;

    if (
      requireWorkspace &&
      !editorContext?.editorStates.currentWorkspace &&
      getPlatform() !== PlatformEnum.Electron
    ) {
      addToast({
        title: "Workspace Required",
        description: "This workflow requires a workspace to be opened.",
        color: "danger",
        endContent: (
          <Button
            color="danger"
            size="sm"
            onPress={() => {
              editorContext?.setEditorStates((prev) => ({
                ...prev,
                isSideMenuOpen: true,
                sideMenuTab: SideMenuTabEnum.Workspace,
                modalStates: {
                  ...prev.modalStates,
                  marketplace: {
                    isOpen: false,
                  },
                },
              }));
            }}
          >
            Configure
          </Button>
        ),
      });
      return undefined;
    }

    let currentTab = activeTabView;

    if (!currentTab || currentTab?.type !== ViewModeEnum.Canvas) {
      currentTab = await createCanvasTabView({
        viewId: createCanvasViewId(),
      } as CanvasViewConfig);
      if (!currentTab) {
        console.error("Failed to create a new canvas tab");
        return;
      }
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

    /* Wait until /components/views/canvas/canvas-view.tsx initializes app node where app is installed and created.  */
    await imcContext?.resolveWhenViewInitialized(appConfig.viewId);

    if (!isLandscape) {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isSideMenuOpen: false,
      }));
    }
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
      appConfigs: (currentTab.config as CanvasViewConfig).appConfigs?.filter(
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

  function findAppInTabView(
    appId: string,
    viewId?: string,
  ): AppViewConfig | undefined {
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
      const appInstances = canvasView.appConfigs?.filter((app) =>
        isAppNameMatched(app.app, appId),
      );
      if ((appInstances?.length ?? 0) > 1) {
        if (!viewId) {
          throw new Error("Multiple instances of the same app found in canvas");
        }
        const appInstance = appInstances?.find((app) => app.viewId === viewId);
        return appInstance;
      }
      const appInstance = appInstances?.[0];
      return appInstance;
    }

    return undefined;
  }

  return {
    tabViews,
    tabItems,
    tabIndex,
    activeTabView,
    selectTab,
    viewCount,
    openFileInView,
    closeTabView,
    closeAllTabViews,
    createAppTabView,
    createCanvasTabView,
    createAppViewInCanvasView,
    deleteAppViewInCanvasView,
    findAppInTabView,
  };
}
