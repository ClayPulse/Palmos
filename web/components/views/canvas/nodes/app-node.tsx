import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppViewConfig } from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { Node } from "@xyflow/react";
import { memo } from "react";
import { v4 } from "uuid";
import BaseAppView from "../../base/base-app-view";
import CanvasNodeViewLayout from "../../layout/canvas-node-view-layout";

const AppNode = memo((props: any) => {
  const nodeProps = props as Node<{ config: AppViewConfig }>;

  const { config }: { config: AppViewConfig } = nodeProps.data;
  const viewId = config.viewId;

  const { createTabView, deleteAppViewInCanvasView } = useTabViewManager();

  async function openViewInFullScreen() {
    await createTabView(ViewModeEnum.App, {
      ...config,
      viewId: v4(),
    });
  }

  return (
    <CanvasNodeViewLayout
      controlActions={{
        fullscreen: () => {
          openViewInFullScreen();
        },
        delete: () => {
          deleteAppViewInCanvasView(viewId);
        },
      }}
    >
      <BaseAppView viewId={viewId} config={config} />
    </CanvasNodeViewLayout>
  );
});

AppNode.displayName = "AppNode";

export default AppNode;
