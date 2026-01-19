"use client";

import { useScreenSize } from "@/lib/hooks/use-screen-size";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { getRemoteClientBaseURL } from "@/lib/module-federation/remote";
import {
  AppDragData,
  AppNodeData,
  AppViewConfig,
  DragData,
  ExtensionApp,
  FileDragData,
} from "@/lib/types";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDndContext,
  useSensor,
} from "@dnd-kit/core";
import { addToast } from "@heroui/react";
import { IMCMessageTypeEnum, ViewModel } from "@pulse-editor/shared-utils";
import { Node as ReactFlowNode } from "@xyflow/react";
import { ReactNode, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { v4 } from "uuid";
import { DraggableItem } from "../misc/draggable-item";
import Icon from "../misc/icon";
import { EditorContext } from "./editor-context-provider";
import { IMCContext } from "./imc-provider";

export default function DndProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const [draggedData, setDraggedData] = useState<DragData | undefined>(
    undefined,
  );

  const mouseSensor = useSensor(MouseSensor, {
    // Activation constraint for mouse: 5px movement
    activationConstraint: {
      distance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    // Press delay of 250ms, with tolerance of 5px of movement
    activationConstraint: {
      delay: 1000,
      tolerance: 100,
    },
  });
  const { isLandscape } = useScreenSize();
  const { createAppViewInCanvasView } = useTabViewManager();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    setDraggedData(data);
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isDraggingOverCanvas: true,
      isSideMenuOpen: isLandscape ? prev.isSideMenuOpen : false,
    }));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { over } = event;

    if (over) {
      // Handle drop logic here
      if (draggedData?.type === "app") {
        const appData = draggedData.data as AppDragData;
        if (over.id.toString().startsWith("canvas-view-")) {
          // Handle app creation drop
          try {
            const app: ExtensionApp = appData.app;
            const config: AppViewConfig = {
              app: app.config.id,
              viewId: `${app.config.id}-${v4()}`,
              initialHeight: app.config.recommendedHeight,
              initialWidth: app.config.recommendedWidth,
            };
            await createAppViewInCanvasView(config);
          } catch (error) {
            addToast({
              title: "Failed to open app",
              description: "The dropped app data is invalid.",
              color: "danger",
            });
          }
        } else if (over.id.toString().startsWith("node-handle-input-")) {
          // Handle app-instance drop
          try {
            const app: ExtensionApp = appData.app;
            const config: AppViewConfig = {
              app: app.config.id,
              viewId: `${app.config.id}-${v4()}`,
              initialHeight: app.config.recommendedHeight,
              initialWidth: app.config.recommendedWidth,
            };

            const { viewId, node, paramName, updateNodeData } = over.data
              .current as {
              viewId: string;
              node: ReactFlowNode<AppNodeData>;
              paramName: string;
              updateNodeData: (id: string, data: Partial<AppNodeData>) => void;
            };

            updateNodeData(viewId, {
              ownedAppViews: {
                ...node.data.ownedAppViews,
                [paramName]: {
                  viewId: config.viewId,
                  appConfig: app.config,
                },
              } as Record<string, ViewModel>,
            });
          } catch (error) {
            addToast({
              title: "Failed to link app",
              description: "The dropped app data is invalid.",
              color: "danger",
            });
          }
        } else {
          addToast({
            title: "Invalid drop target",
            description: "You cannot drop the file here.",
            color: "warning",
          });
        }
      } else if (
        draggedData?.type === "file" &&
        over.id.toString().startsWith("app-node-view-")
      ) {
        // Handle file drop into app
        const fileData = draggedData.data as FileDragData;

        try {
          const uri = fileData.uri;

          const { viewId } = over.data.current as {
            viewId: string;
          };

          // Send uri to app view
          await imcContext?.polyIMC?.sendMessage(
            viewId,
            IMCMessageTypeEnum.EditorAppReceiveFileUri,
            {
              uri,
            },
          );
        } catch (error) {
          addToast({
            title: "Failed to open file",
            description: "The dropped file data is invalid.",
            color: "danger",
          });
        }
      } else {
        addToast({
          title: "Invalid drop target",
          description: "Something went wrong when dropping the item.",
          color: "danger",
        });
      }
    } else {
      addToast({
        title: "Invalid drop target",
        description: "You cannot drop the item here.",
        color: "warning",
      });
    }

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isDraggingOverCanvas: false,
    }));

    setDraggedData(undefined);
  }

  return (
    <DndContext
      sensors={[mouseSensor, touchSensor]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      {children}

      {mounted && <DraggableOverlay data={draggedData} />}
    </DndContext>
  );
}

function DraggableOverlay({ data }: { data: DragData | undefined }) {
  const editorContext = useContext(EditorContext);
  const { active, over } = useDndContext();

  useEffect(() => {
    const overId = over?.id.toString();

    if (overId?.startsWith("canvas-view-") && data?.type === "app") {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        dropMessage: "Drop app here to add to current canvas",
      }));
    } else if (
      overId?.startsWith("node-handle-input-") &&
      data?.type === "app"
    ) {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        dropMessage: "Drop app here to create app instance for node",
      }));
    } else if (overId?.startsWith("app-node-view-") && data?.type === "file") {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        dropMessage: "Drop file here to send to app",
      }));
    } else {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        dropMessage: undefined,
      }));
    }
  }, [over]);

  // Don’t render portal until client-side
  if (typeof document === "undefined") return null;

  return createPortal(
    <DragOverlay dropAnimation={null}>
      {active ? (
        <DraggableItem>
          <DragPreview data={data} />
        </DraggableItem>
      ) : null}
    </DragOverlay>,
    document.body,
  );
}

function DragPreview({ data }: { data: DragData | undefined }) {
  const [thumbnailImage, setThumbnailImage] = useState<string | undefined>(
    undefined,
  );

  // Load thumbnail image
  useEffect(() => {
    function loadThumbnail(extension: ExtensionApp) {
      if (extension.config.thumbnail) {
        const imageUrl =
          getRemoteClientBaseURL(
            extension.config.id,
            extension.config.version,
            extension.remoteOrigin,
          ) +
          "/" +
          extension.config.thumbnail;
        setThumbnailImage(imageUrl);
      }
    }

    if (data?.type === "app") {
      loadThumbnail((data.data as AppDragData).app);
    }
  }, [data]);

  if (data?.type === "app") {
    const appData = data.data as AppDragData;

    return (
      <div className="bg-content3 h-36 w-48 overflow-hidden rounded-xl">
        {thumbnailImage && (
          <img
            src={thumbnailImage}
            alt={appData.app.config.thumbnail}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    );
  } else if (data?.type === "file") {
    return (
      <div>
        <Icon name="file_open" variant="outlined" />
      </div>
    );
  }
}
