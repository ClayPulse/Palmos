import {
  AppViewConfig,
  CanvasViewConfig,
  TabView,
  ViewModeEnum,
} from "@/lib/types";
import { useEffect, useState, memo, useCallback } from "react";
import HomeView from "./home/home-view";
import CanvasView from "./canvas/canvas-view";
import { useSearchParams } from "next/navigation";
import StandaloneAppView from "./standalone-app/standalone-app-view";
import Tabs from "../misc/tabs";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";

const MemoizedStandaloneAppView = memo(StandaloneAppView);
const MemoizedCanvasView = memo(CanvasView);

export default function ViewArea() {
  const params = useSearchParams();

  const {
    tabViews,
    tabIndex,
    selectTab: setTabIndex,
    closeView,
    createTabView,
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

  const openInAppView = useCallback((config: AppViewConfig) => {
    createTabView(ViewModeEnum.App, config);
  }, []);

  function openInCanvasView(config: AppViewConfig) {
    createTabView(ViewModeEnum.Canvas, config);
  }

  function createNewCanvas() {
    createTabView(ViewModeEnum.Canvas, {});
  }

  useEffect(() => {
    // Standalone app mode
    const app = params?.get("app");
    const inviteCode = params?.get("inviteCode") || undefined;
    const fileUri = params?.get("fileUri") || undefined;

    if (app) {
      // Add app to tabs if not already present
      const existingAppIndex = tabViews.findIndex(
        (view) =>
          view.type === ViewModeEnum.App &&
          (view.config as AppViewConfig).app === app,
      );

      if (existingAppIndex === -1) {
        // Create new tab if not already exists
        createTabView(ViewModeEnum.App, { app, inviteCode, fileUri });
      } else {
        setTabIndex(existingAppIndex);
      }

      // Hide tabs if in standalone app mode
      setIsShowTabs(false);
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
        <div className="border-default-border bg-content2 w-full rounded-lg px-1">
          {/* Add tabs here */}
          <Tabs
            tabItems={tabItems}
            selectedItem={tabItems[tabIndex] ? tabItems[tabIndex] : undefined}
            setSelectedItem={(item) => {
              const index = tabItems.findIndex(
                (tab) => tab.name === item?.name,
              );
              setTabIndex(index !== -1 ? index : 0);
            }}
            isShowPagination={true}
            onTabClose={(item) => {
              const index = tabItems.findIndex(
                (tab) => tab.name === item?.name,
              );
              if (index !== -1) {
                closeView(tabViews[index]);
              }
            }}
          />
        </div>
      )}
      <div className="h-full w-full">
        {tabViews.map((tabView, idx) => (
          <div
            key={tabView.viewId}
            data-is-active={idx === tabIndex}
            className="hidden h-full w-full data-[is-active=true]:block"
          >
            {tabView.type === ViewModeEnum.App ? (
              <MemoizedStandaloneAppView
                viewId={tabView.viewId}
                config={tabView.config as AppViewConfig}
              />
            ) : tabView.type === ViewModeEnum.Canvas ? (
              <MemoizedCanvasView
                viewId={tabView.viewId}
                config={tabView.config as CanvasViewConfig}
                openViewInFullScreen={openInAppView}
              />
            ) : (
              <div>Unknown view type</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
