import {
  AppViewConfig,
  CanvasViewConfig,
  TabView,
  ViewModeEnum,
} from "@/lib/types";
import { useEffect, useState, useRef, memo, useCallback } from "react";
import HomeView from "./home/home-view";
import CanvasView from "./canvas/canvas-view";
import { useSearchParams } from "next/navigation";
import StandaloneAppView from "./standalone-app/standalone-app-view";
import Tabs from "../misc/tabs";

const MemoizedStandaloneAppView = memo(StandaloneAppView);
const MemoizedCanvasView = memo(CanvasView);

export default function ViewArea() {
  const params = useSearchParams();

  const [tabViews, setTabViews] = useState<TabView[]>([]);
  const [isShowTabs, setIsShowTabs] = useState<boolean>(false);
  const [tabIndex, setTabIndex] = useState<number>(-1);

  const tabItems = tabViews.map((view) => ({
    name:
      view.type === ViewModeEnum.App
        ? (view.config as AppViewConfig).app || "App"
        : "Canvas",
    description:
      view.type === ViewModeEnum.App
        ? `App: ${(view.config as AppViewConfig).app}`
        : "Canvas View",
  }));

  const openInAppView = useCallback((config: AppViewConfig) => {
    setTabViews((prev) => {
      const newViews = [...prev, { type: ViewModeEnum.App, config }];
      const newIdx = newViews.length - 1;
      setTabIndex(newIdx);
      return newViews;
    });
  }, []);

  function openInCanvasView(config: AppViewConfig) {
    setTabViews((prev) => [...prev, { type: ViewModeEnum.Canvas, config }]);
    setTabIndex(tabViews.length); // Set to the new tab
  }

  function createNewCanvas() {
    setTabViews((prev) => [...prev, { type: ViewModeEnum.Canvas, config: {} }]);
    setTabIndex(tabViews.length); // Set to the new tab
  }

  useEffect(() => {
    // Standalone app mode
    const app = params?.get("app");
    const inviteCode = params?.get("inviteCode") || undefined;
    const file = params?.get("file") || undefined;

    if (app) {
      // Add app to tabs if not already present
      const existingAppIndex = tabViews.findIndex(
        (view) =>
          view.type === ViewModeEnum.App &&
          (view.config as AppViewConfig).app === app,
      );

      if (existingAppIndex === -1) {
        // Create new tab if not already exists
        setTabViews((prev) => [
          ...prev,
          {
            type: ViewModeEnum.App,
            config: { app, inviteCode, initialFileUri: file },
          },
        ]);
        setTabIndex(tabViews.length); // Set to the new tab
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
          />
        </div>
      )}
      <div className="h-full w-full">
        {tabViews.map((tabView, idx) => (
          <div
            key={idx}
            data-is-active={idx === tabIndex}
            className="hidden h-full w-full data-[is-active=true]:block"
          >
            {tabView.type === ViewModeEnum.App ? (
              <MemoizedStandaloneAppView
                config={tabView.config as AppViewConfig}
              />
            ) : tabView.type === ViewModeEnum.Canvas ? (
              <MemoizedCanvasView
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
