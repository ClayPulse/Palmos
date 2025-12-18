import AppPreviewCard from "@/components/marketplace/app/app-preview-card";
import WorkflowPreviewCard from "@/components/marketplace/workflow/workflow-preview-card";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkflowManager } from "@/lib/hooks/use-workflow-manager";
import { AppViewConfig } from "@/lib/types";
import { v4 } from "uuid";

export default function HomeView() {
  const { installedExtensionApps } = useExtensionAppManager();
  const { createAppViewInCanvasView } = useTabViewManager();
  const { workflows } = useWorkflowManager("All");

  return (
    <div className="text-default-foreground grid h-full w-full grid-rows-[max-content_max-content_auto] flex-col px-2 pt-18">
      <h1 className="pb-4 text-center text-3xl font-semibold">
        Pulse Editor Dashboard
      </h1>
      <div className="bg-content1 h-full w-full gap-y-1 overflow-x-auto rounded-sm px-6 py-4">
        <h2 className="pb-2 text-center text-2xl font-semibold">
          Explore Community Apps
        </h2>
        <div className="flex h-60 items-stretch gap-x-2 overflow-x-auto overflow-y-hidden">
          {installedExtensionApps.map((app, index) => (
            <div key={index} className="h-full min-w-40 shrink-0">
              <AppPreviewCard
                extension={app}
                isShowCompatibleChip={false}
                isShowInstalledChip={false}
                isShowUninstallButton={false}
                isShowUseButton
                isShowContextMenu={false}
                onPress={async (ext) => {
                  // TODO: implement open this in project modal
                  const config: AppViewConfig = {
                    app: ext.config.id,
                    viewId: `${ext.config.id}-${v4()}`,
                    recommendedHeight: ext.config.recommendedHeight,
                    recommendedWidth: ext.config.recommendedWidth,
                  };
                  await createAppViewInCanvasView(config);
                }}
              />
            </div>
          ))}
        </div>
        <h2 className="pb-2 text-center text-2xl font-semibold">
          Explore Community Workflows
        </h2>
        <div className="flex h-60 items-stretch gap-x-2 overflow-x-auto overflow-y-hidden">
          {workflows?.map((wf, index) => (
            <div key={index} className="h-full min-w-40 shrink-0">
              <WorkflowPreviewCard workflow={wf} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="pt-4 pb-2 text-center text-2xl font-semibold">
          Recent Projects
        </h2>
      </div>
    </div>
  );
}
