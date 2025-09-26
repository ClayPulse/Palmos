import { AppViewConfig } from "@/lib/types";
import { Node } from "@xyflow/react";
import BaseAppView from "../../base/base-app-view";
import { memo } from "react";
import CanvasNodeViewLayout from "../../layout/canvas-node-view-layout";

const AppNode = memo((props: any) => {
  const nodeProps = props as Node<{ config: AppViewConfig }> & {
    openViewInFullScreen?: (config: AppViewConfig) => void;
  };
  const openViewInFullScreen = nodeProps.openViewInFullScreen;
  const { config }: { config: AppViewConfig } = nodeProps.data;
  const viewId = config.viewId;

  return (
    <CanvasNodeViewLayout
      controlActions={{
        fullscreen: openViewInFullScreen
          ? () =>
              openViewInFullScreen({
                viewId: viewId,
                app: config.app,
                recommendedHeight: config.recommendedHeight,
                recommendedWidth: config.recommendedWidth,
              })
          : undefined,
      }}
    >
      <BaseAppView viewId={viewId} config={config} />
    </CanvasNodeViewLayout>
  );
});

AppNode.displayName = "AppNode";

export default AppNode;
