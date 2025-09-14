import {
  AppViewConfig,
  CanvasViewConfig,
  TabView,
  ViewModeEnum,
} from "@/lib/types";
import { useEffect, useState } from "react";
import HomeView from "./home/home-view";
import CanvasView from "./canvas/canvas-view";
import { useSearchParams } from "next/navigation";
import StandaloneAppView from "./standalone-app/standalone-app-view";

export default function ViewArea() {
  const params = useSearchParams();

  const [tabViews, setTabViews] = useState<TabView[]>([]);
  const [isShowTabs, setIsShowTabs] = useState<boolean>(true);
  const [tabIndex, setTabIndex] = useState<number>(-1);

  const [currentTabView, setCurrentTabView] = useState<TabView | undefined>(
    undefined,
  );

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
    }
  }, [params]);

  useEffect(() => {
    // Set active tab view based on tab index
    if (tabIndex >= 0 && tabIndex < tabViews.length) {
      setCurrentTabView(tabViews[tabIndex]);
    } else {
      setCurrentTabView(undefined);
    }

    // Hide tabs if only one tab
    if (tabViews.length <= 1) {
      setIsShowTabs(false);
    }
    // Hide tabs if in standalone app mode
    const app = params?.get("app");
    if (app) {
      setIsShowTabs(false);
    }
  }, [tabIndex]);

  if (tabViews.length === 0) {
    return <HomeView />;
  }

  if (!currentTabView) {
    return <div>No view selected</div>;
  }

  return (
    <div
      className="grid h-full w-full grid-rows-1 px-2 pt-17 data-[is-show-tabs=true]:grid-rows-[max-content_auto]"
      data-is-show-tabs={isShowTabs}
    >
      {isShowTabs && (
        <div className="border-default-border bg-content1 h-8 w-full rounded-t-lg border-b">
          {/* Add tabs here */}(
          <div className="tabs">
            {tabViews.map((view, index) => (
              <div
                key={index}
                className={`tab ${tabIndex === index ? "active" : ""}`}
                onClick={() => setTabIndex(index)}
              >
                {view.type === ViewModeEnum.App
                  ? (view.config as AppViewConfig).app
                  : "Canvas"}
              </div>
            ))}
          </div>
          )
        </div>
      )}
      <div className="h-full w-full">
        {currentTabView.type === ViewModeEnum.App ? (
          <StandaloneAppView config={currentTabView.config as AppViewConfig} />
        ) : currentTabView.type === ViewModeEnum.Canvas ? (
          <CanvasView config={currentTabView.config as CanvasViewConfig} />
        ) : (
          <div>Unknown view type</div>
        )}
      </div>
    </div>
  );
}
