import useScopedActions from "@/lib/hooks/use-scoped-actions";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppNodeData } from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { Node } from "@xyflow/react";
import { memo } from "react";
import { v4 } from "uuid";
import BaseAppView from "../../../base/base-app-view";
import CanvasNodeViewLayout from "./layout";

const AppNode = memo((props: any) => {
  const nodeProps = props as Node<AppNodeData>;

  const { config, selectedAction, setSelectedAction }: AppNodeData =
    nodeProps.data;
  const viewId = config.viewId;

  const { createTabView, deleteAppViewInCanvasView } = useTabViewManager();
  const { runAction, actions } = useScopedActions(config.app);

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
    >
      <BaseAppView viewId={viewId} config={config} />
    </CanvasNodeViewLayout>
  );
});

AppNode.displayName = "AppNode";

export default AppNode;
