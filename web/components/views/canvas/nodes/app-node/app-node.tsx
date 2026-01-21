import { EditorContext } from "@/components/providers/editor-context-provider";
import useActionExecutor from "@/lib/hooks/use-action-executor";
import { useCanvas } from "@/lib/hooks/use-canvas";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppNodeData, NodeShape, NodeShapeAndLocation } from "@/lib/types";
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
    isFullscreen,
  }: AppNodeData = nodeProps.data;
  const viewId = config.viewId;

  const { deleteAppViewInCanvasView } = useTabViewManager();
  const { actions } = useActionExecutor(config.app);
  const { updateNode, zoomTo, updateNodeData } = useReactFlow();
  const viewport = useViewport();
  const node = useInternalNode(viewId);
  const { getViewCenterCoordForNode } = useCanvas();

  const initialShapeAndLocation: NodeShape = {
    width: nodeProps.data.config.initialWidth ?? 800,
    height: nodeProps.data.config.initialHeight ?? 600,
  };

  const [previousShapeAndLocation, setPreviousShapeAndLocation] =
    useState<NodeShapeAndLocation | null>(null);

  async function setIsFullscreen(value: boolean) {
    await updateNodeData(viewId, { isFullscreen: value });
  }

  // In fullscreen mode, adjust the node size and position when the canvas size changes
  useEffect(() => {
    if (isFullscreen) {
      zoomToFitNodeFullscreen();
    }
  }, [isFullscreen, editorContext?.editorStates.canvasSize]);

  // If the node is fullscreen and previousShapeAndLocation is null, set it to
  // the initial shape and location
  useEffect(() => {
    if (isFullscreen && !previousShapeAndLocation) {
      setPreviousShapeAndLocation({
        width: initialShapeAndLocation.width,
        height: initialShapeAndLocation.height,
        zoom: 1,
        zIndex: 1,
      });
    }
  }, [isFullscreen, previousShapeAndLocation]);

  // Toggle fullscreen mode
  useEffect(() => {
    async function toggleFullscreenEffect() {
      if (!node) return;

      if (!isFullscreen) {
        if (previousShapeAndLocation) {
          await zoomTo(previousShapeAndLocation.zoom);
          await updateNode(viewId, {
            width: previousShapeAndLocation.width,
            height: previousShapeAndLocation.height,
            position:
              previousShapeAndLocation.x && previousShapeAndLocation.y
                ? {
                    x: previousShapeAndLocation.x,
                    y: previousShapeAndLocation.y,
                  }
                : node.position,
            zIndex: previousShapeAndLocation.zIndex,
          });
          setPreviousShapeAndLocation(null);
        }
      } else {
        setPreviousShapeAndLocation({
          width: node.width as number,
          height: node.height as number,
          zoom: viewport.zoom,
          x: node.position.x,
          y: node.position.y,
          zIndex: node.zIndex,
        });
        await zoomToFitNodeFullscreen();
      }
    }

    toggleFullscreenEffect();
  }, [isFullscreen]);

  // Fit node to current canvas size in fullscreen mode
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

  async function toggleFullScreen() {
    if (!node) return;
    setIsFullscreen(!isFullscreen);

    // if (isFullscreen) {
    //   if (previousShapeAndLocation) {
    //     await zoomTo(previousShapeAndLocation.zoom);
    //     await updateNode(viewId, {
    //       width: previousShapeAndLocation.width,
    //       height: previousShapeAndLocation.height,
    //       position:
    //         previousShapeAndLocation.x && previousShapeAndLocation.y
    //           ? {
    //               x: previousShapeAndLocation.x,
    //               y: previousShapeAndLocation.y,
    //             }
    //           : node.position,
    //       zIndex: previousShapeAndLocation.zIndex,
    //     });
    //     setPreviousShapeAndLocation(null);
    //   }

    //   setIsFullscreen(false);
    // } else {
    //   setPreviousShapeAndLocation({
    //     width: node.width as number,
    //     height: node.height as number,
    //     zoom: viewport.zoom,
    //     x: node.position.x,
    //     y: node.position.y,
    //     zIndex: node.zIndex,
    //   });

    //   await zoomToFitNodeFullscreen();
    //   setIsFullscreen(true);
    // }
  }

  return (
    <CanvasNodeViewLayout
      viewId={viewId}
      actions={actions.map((a) => a.action)}
      selectedAction={selectedAction}
      controlActions={{
        fullscreen: () => {
          toggleFullScreen();
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
