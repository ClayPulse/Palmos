import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppViewConfig, CanvasViewConfig } from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useSearchParams } from "next/navigation";
import { lazy, Suspense, useContext, useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import Tabs from "../misc/tabs";
import { EditorContext } from "../providers/editor-context-provider";
import HomeView from "./home/home-view";
import ProjectView from "./project/project-view";
// import { MemoizedCanvasView } from "./canvas/canvas-view";
// import { MemoizedStandaloneAppView } from "./standalone-app/standalone-app-view";

const LazyCanvasView = lazy(() =>
  import("./canvas/canvas-view").then((mod) => ({
    default: mod.MemoizedCanvasView,
  })),
);
const LazyStandaloneAppView = lazy(() =>
  import("./standalone-app/standalone-app-view").then((mod) => ({
    default: mod.MemoizedStandaloneAppView,
  })),
);

export default function ViewArea() {
  const editorContext = useContext(EditorContext);

  const params = useSearchParams();

  const {
    tabViews,
    tabItems,
    tabIndex,
    selectTab,
    closeTabView,
    createAppTabView,
    activeTabView,
  } = useTabViewManager();

  const [isShowTabs, setIsShowTabs] = useState<boolean>(false);

  const isInitialized = useRef(false);
  const app = params?.get("app");

  useEffect(() => {
    // Standalone app mode
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
          const viewId = `${app}-${v4()}`;
          await createAppTabView({
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
  }, [tabViews]);

  return (
    <div className="h-full w-full overflow-hidden">
      {!editorContext?.editorStates.project && app === null ? (
        <HomeView />
      ) : tabViews.length === 0 ? (
        <ProjectView />
      ) : tabIndex >= 0 && tabIndex < tabViews.length ? (
        <div
          className="relative grid h-full w-full grid-rows-1 gap-y-0.5 data-[is-show-tabs=false]:data-[type=app]:pt-17 data-[is-show-tabs=true]:data-[type=app]:grid-rows-[max-content_auto]"
          data-is-show-tabs={isShowTabs}
          data-type={activeTabView?.type}
        >
          {isShowTabs && (
            <div
              className="z-20 w-full px-2 pt-17 data-[type=canvas]:absolute"
              data-type={activeTabView?.type}
            >
              <div className="border-default-border bg-content2 w-full rounded-lg py-0.5 shadow-md">
                <Tabs
                  tabItems={tabItems}
                  selectedItem={
                    tabItems[tabIndex] ? tabItems[tabIndex] : undefined
                  }
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
            </div>
          )}
          <div className="relative h-full w-full">
            {tabViews.map((tabView, idx) => (
              <div
                key={tabView.config.viewId}
                data-is-active={idx === tabIndex}
                data-type={tabView.type}
                className="hidden h-full w-full data-[is-active=true]:block data-[type=app]:px-2"
              >
                <Suspense
                  fallback={<div className="bg-default h-full w-full" />}
                >
                  {tabView.type === ViewModeEnum.App ? (
                    <LazyStandaloneAppView
                      config={tabView.config as AppViewConfig}
                    />
                  ) : tabView.type === ViewModeEnum.Canvas ? (
                    <LazyCanvasView
                      config={tabView.config as CanvasViewConfig}
                      isActive={idx === tabIndex}
                      tabName={tabItems[idx]?.name}
                    />
                  ) : (
                    <div>Unknown view type</div>
                  )}
                </Suspense>
              </div>
            ))}
          </div>

          {editorContext?.editorStates.dropMessage && (
            <div className="absolute top-16 z-40 w-full text-center">
              {editorContext?.editorStates.dropMessage}
            </div>
          )}
        </div>
      ) : (
        <div>No view selected</div>
      )}
    </div>
  );
}
