import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppViewConfig, CanvasViewConfig } from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { ReactFlowProvider } from "@xyflow/react";
import { useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import Tabs from "../misc/tabs";
import CanvasView from "./canvas/canvas-view";
import HomeView from "./home/home-view";
import StandaloneAppView from "./standalone-app/standalone-app-view";

const MemoizedStandaloneAppView = memo(StandaloneAppView);
const MemoizedCanvasView = memo(({ config }: { config: CanvasViewConfig }) => (
  <ReactFlowProvider>
    <CanvasView config={config} />
  </ReactFlowProvider>
));
MemoizedCanvasView.displayName = "MemoizedCanvasView";

export default function ViewArea() {
  const params = useSearchParams();

  const {
    tabViews,
    tabIndex,
    selectTab,
    closeTabView,
    createTabView,
    deleteAppViewInCanvasView,
    activeTabView,
  } = useTabViewManager();

  const [isShowTabs, setIsShowTabs] = useState<boolean>(false);

  // Generate tab names with index suffixes for duplicates
  const nameCounts: Record<string, number> = {};
  tabViews.forEach((view) => {
    const baseName =
      view.type === ViewModeEnum.App
        ? (view.config as AppViewConfig).app
        : "Canvas";
    nameCounts[baseName] = (nameCounts[baseName] || 0) + 1;
  });

  const nameIndexes: Record<string, number> = {};
  const tabItems =
    tabViews.map((view) => {
      const baseName =
        view.type === ViewModeEnum.App
          ? (view.config as AppViewConfig).app
          : "Canvas";
      nameIndexes[baseName] = (nameIndexes[baseName] || 0) + 1;
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

  const openInCanvasView = useCallback(async (config: CanvasViewConfig) => {
    await createTabView(ViewModeEnum.Canvas, config);
  }, []);

  const createNewCanvas = useCallback(async () => {
    await createTabView(ViewModeEnum.Canvas, {
      viewId: v4(),
    });
  }, []);

  const removeAppFromCanvas = useCallback(
    async (viewId: string) => {
      await deleteAppViewInCanvasView(viewId);
    },
    [activeTabView],
  );

  const isInitialized = useRef(false);

  useEffect(() => {
    // Standalone app mode
    const app = params?.get("app");
    const inviteCode = params?.get("inviteCode") || undefined;
    const fileUri = params?.get("fileUri") || undefined;

    async function openInStandaloneApp() {
      if (app) {
        // Add app to tabs if not already present
        const existingAppIndex = tabViews.findIndex(
          (view) =>
            view.type === ViewModeEnum.App &&
            (view.config as AppViewConfig).app === app,
        );

        if (existingAppIndex === -1) {
          // Create new tab if not already exists
          const viewId = v4();
          await createTabView(ViewModeEnum.App, {
            viewId,
            app,
            inviteCode,
            fileUri,
          });
        } else {
          selectTab(existingAppIndex);
        }

        // Hide tabs if in standalone app mode
        setIsShowTabs(false);
      }
    }

    if (!isInitialized.current) {
      openInStandaloneApp();
      isInitialized.current = true;
    }
  }, [params]);

  useEffect(() => {
    // Hide tabs if only one tab
    if (tabViews.length <= 1) {
      setIsShowTabs(false);
    } else {
      setIsShowTabs(true);
    }
    console.log("Tab views changed:", tabViews);
  }, [tabViews]);

  if (tabViews.length === 0) {
    return <HomeView createNewCanvas={createNewCanvas} />;
  }

  if (tabIndex < 0 || tabIndex >= tabViews.length) {
    return <div>No view selected</div>;
  }

  return (
    <div
      className="grid h-full w-full grid-rows-1 gap-y-0.5 px-2 pt-17 data-[is-show-tabs=true]:grid-rows-[max-content_auto]"
      data-is-show-tabs={isShowTabs}
    >
      {isShowTabs && (
        <div className="border-default-border bg-content2 w-full rounded-lg py-0.5">
          <Tabs
            tabItems={tabItems}
            selectedItem={tabItems[tabIndex] ? tabItems[tabIndex] : undefined}
            setSelectedItem={(item) => {
              const index = tabItems.findIndex(
                (tab) => tab.name === item?.name,
              );
              selectTab(index !== -1 ? index : 0);
            }}
            isShowPagination={true}
            onTabClose={(item) => {
              const index = tabItems.findIndex(
                (tab) => tab.name === item?.name,
              );
              if (index !== -1) {
                closeTabView(tabViews[index]);
              }
            }}
          />
        </div>
      )}
      <div className="h-full w-full">
        {tabViews.map((tabView, idx) => (
          <div
            key={tabView.config.viewId}
            data-is-active={idx === tabIndex}
            className="hidden h-full w-full data-[is-active=true]:block"
          >
            {tabView.type === ViewModeEnum.App ? (
              <MemoizedStandaloneAppView
                config={tabView.config as AppViewConfig}
              />
            ) : tabView.type === ViewModeEnum.Canvas ? (
              <MemoizedCanvasView config={tabView.config as CanvasViewConfig} />
            ) : (
              <div>Unknown view type</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
