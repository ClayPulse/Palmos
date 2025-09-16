import { AppViewConfig } from "@/lib/types";
import { Node } from "@xyflow/react";
import BaseAppView from "../../base/base-app-view";
import { memo } from "react";
import ViewControlLayout from "../../layout/view-control-layout";

const AppNode = memo((props: any) => {
  const nodeProps = props as Node<{ config: AppViewConfig }> & {
    viewId: string;
    openViewInFullScreen?: (config: AppViewConfig) => void;
  };
  const viewId = nodeProps.viewId;
  const openViewInFullScreen = nodeProps.openViewInFullScreen;
  const { config }: { config: AppViewConfig } = nodeProps.data;

  return (
    <ViewControlLayout
      type="canvas"
      controlActions={{
        fullscreen: openViewInFullScreen
          ? () =>
              openViewInFullScreen({
                app: config.app,
              })
          : undefined,
      }}
    >
      <BaseAppView viewId={viewId} config={config} />
    </ViewControlLayout>
  );
});

AppNode.displayName = "AppNode";

export default AppNode;
