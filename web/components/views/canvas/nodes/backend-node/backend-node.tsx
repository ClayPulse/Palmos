import BaseAppView from "@/components/views/base/base-app-view";
import useScopedActions from "@/lib/hooks/use-scoped-actions";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppNodeData } from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { Node } from "@xyflow/react";
import { memo } from "react";
import { v4 } from "uuid";
import CanvasNodeViewLayout from "../app-node/layout";

/* Runs backend part of pulse app. */
const BackendNode = memo((props: any) => {
  const nodeProps = props as Node<AppNodeData>;

  const { config, selectedAction, setSelectedAction, isRunning }: AppNodeData =
    nodeProps.data;
  const viewId = config.viewId;

  const { createTabView, deleteAppViewInCanvasView } = useTabViewManager();
  const { actions } = useScopedActions(config.app);

  async function openViewInFullScreen() {
    await createTabView(ViewModeEnum.App, {
      ...config,
      viewId: v4(),
    });
  }

  return (
    <CanvasNodeViewLayout
      viewId={viewId}
      actions={actions.map((a) => a.action)}
      selectedAction={selectedAction}
      setSelectedAction={setSelectedAction}
      controlActions={{
        fullscreen: () => {
          openViewInFullScreen();
        },
        delete: () => {
          deleteAppViewInCanvasView(viewId);
        },
      }}
      isRunning={isRunning}
    >
      <BaseAppView viewId={viewId} config={config} />
    </CanvasNodeViewLayout>
  );
});

BackendNode.displayName = "BackendNode";

export default BackendNode;
