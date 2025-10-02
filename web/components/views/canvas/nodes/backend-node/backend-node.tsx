import { AppViewConfig } from "@/lib/types";
import { Node } from "@xyflow/react";
import { memo } from "react";
import CanvasNodeViewLayout from "../app-node/layout";
import BaseAppView from "@/components/views/base/base-app-view";

/* Runs backend part of pulse app. */
const BackendNode = memo((props: any) => {
  const nodeProps = props as Node<{ config: AppViewConfig }> & {
    openViewInFullScreen?: (config: AppViewConfig) => void;
  };
  const openViewInFullScreen = nodeProps.openViewInFullScreen;
  const { config }: { config: AppViewConfig } = nodeProps.data;
  const viewId = config.viewId;

  return (
    <CanvasNodeViewLayout
      viewId={viewId}
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

BackendNode.displayName = "BackendNode";

export default BackendNode;
