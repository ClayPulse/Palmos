import { EditorContext } from "@/components/providers/editor-context-provider";
import { useReactFlow } from "@xyflow/react";
import { useContext } from "react";

export function useCanvas() {
  const editorContext = useContext(EditorContext);
  const { screenToFlowPosition } = useReactFlow();

  /**
   * Find the position for centering an app in the current canvas view
   * @param appConfig The app view configuration to center
   * @returns The position to center the app at
   */
  function getScreenCenter() {
    const canvasSize = editorContext?.editorStates.canvasSize;
    if (!canvasSize) {
      return { x: 0, y: 0 };
    }

    const screenCenter = {
      x: canvasSize.x + canvasSize.width / 2,
      y: canvasSize.y + canvasSize.height / 2,
    };

    return screenCenter;
  }

  function getViewCenterCoordForNode(
    width: number,
    height: number,
    zoom: number,
  ) {
    const screenCenter = getScreenCenter();

    return screenToFlowPosition({
      x: screenCenter.x - (width / 2) * zoom,
      y: screenCenter.y - (height / 2) * zoom,
    });
  }

  return {
    getScreenCenter,
    getViewCenterCoordForNode,
  };
}
