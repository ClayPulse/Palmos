import useActionExecutor from "@/lib/hooks/use-action-executor";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppNodeData } from "@/lib/types";
import { Node } from "@xyflow/react";
import { memo } from "react";
import { v4 } from "uuid";
import BaseAppView from "../../../base/base-app-view";
import CanvasNodeViewLayout from "./layout";

const AppNode = memo((props: any) => {
  const nodeProps = props as Node<AppNodeData>;

  const {
    config,
    selectedAction,
    isRunning,
    isShowingWorkflowConnector,
  }: AppNodeData = nodeProps.data;
  const viewId = config.viewId;

  const { createAppTabView, deleteAppViewInCanvasView } = useTabViewManager();
  const { actions } = useActionExecutor(config.app);

  async function openViewInFullScreen() {
    await createAppTabView({
      ...config,
      viewId: `${config.app}-${v4()}`,
    });
  }

  return (
    <CanvasNodeViewLayout
      viewId={viewId}
      actions={actions.map((a) => a.action)}
      selectedAction={selectedAction}
      controlActions={{
        fullscreen: () => {
          openViewInFullScreen();
        },
        delete: () => {
          deleteAppViewInCanvasView(viewId);
        },
      }}
      isRunning={isRunning}
      isShowingWorkflowConnector={isShowingWorkflowConnector}
    >
      <BaseAppView viewId={viewId} config={config} />
    </CanvasNodeViewLayout>
  );
});

AppNode.displayName = "AppNode";

export default AppNode;
