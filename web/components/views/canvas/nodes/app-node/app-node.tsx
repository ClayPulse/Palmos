import { EditorContext } from "@/components/providers/editor-context-provider";
import useActionExecutor from "@/lib/hooks/use-action-executor";
import { useCanvas } from "@/lib/hooks/use-canvas";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppNodeData } from "@/lib/types";
import {
  Node as ReactFlowNode,
  useInternalNode,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import { memo, useContext, useEffect, useState } from "react";
import BaseAppView from "../../../base/base-app-view";
import CanvasNodeViewLayout from "./layout";

const AppNode = memo((props: any) => {
  const editorContext = useContext(EditorContext);
  const nodeProps = props as ReactFlowNode<AppNodeData>;

  const {
    config,
    selectedAction,
    isRunning,
    isShowingWorkflowConnector,
  }: AppNodeData = nodeProps.data;
  const viewId = config.viewId;

  // const {
  const { createAppTabView, deleteAppViewInCanvasView, activeTabView } =
    useTabViewManager();
  const { actions } = useActionExecutor(config.app);
  const { updateNode, zoomTo } = useReactFlow();
  const viewport = useViewport();
  const node = useInternalNode(viewId);
  const { getViewCenterCoordForNode } = useCanvas();

  const [previousPosition, setPreviousPosition] = useState<{
    width: number;
    height: number;
    zoom: number;
    x: number;
    y: number;
    zIndex?: number;
  } | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isFullscreen) {
      zoomToFitNodeFullscreen();
    }
  }, [isFullscreen, editorContext?.editorStates.canvasSize]);

  async function zoomToFitNodeFullscreen() {
    const padding = 4;
    const width =
      (editorContext?.editorStates.canvasSize?.width ?? 0) - padding * 2;
    const height =
      (editorContext?.editorStates.canvasSize?.height ?? 0) - 72 - padding * 2;

    const viewCenter = getViewCenterCoordForNode(width, height, viewport.zoom);

    await updateNode(viewId, {
      width: width,
      height: height,
      position: {
        x: 0 + viewCenter.x,
        y: 72 / 2 + viewCenter.y,
      },
      zIndex: 1000,
    });
    await zoomTo(1);
  }

  async function openViewInFullScreen() {
    if (!node) return;

    if (isFullscreen) {
      if (previousPosition) {
        await zoomTo(previousPosition.zoom);
        await updateNode(viewId, {
          width: previousPosition.width,
          height: previousPosition.height,
          position: {
            x: previousPosition.x,
            y: previousPosition.y,
          },
          zIndex: previousPosition.zIndex,
        });
        setPreviousPosition(null);
      }

      setIsFullscreen(false);
    } else {
      setPreviousPosition({
        width: node.width as number,
        height: node.height as number,
        zoom: viewport.zoom,
        x: node.position.x,
        y: node.position.y,
        zIndex: node.zIndex,
      });

      await zoomToFitNodeFullscreen();
      setIsFullscreen(true);
    }
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
      isFullScreen={isFullscreen}
    >
      <BaseAppView viewId={viewId} config={config} />
    </CanvasNodeViewLayout>
  );
});

AppNode.displayName = "AppNode";

export default AppNode;
