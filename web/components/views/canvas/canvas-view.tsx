import { EditorContext } from "@/components/providers/editor-context-provider";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useCanvas } from "@/lib/hooks/use-canvas";
import useCanvasWorkflow from "@/lib/hooks/use-canvas-workflow";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppNodeData, AppViewConfig, CanvasViewConfig } from "@/lib/types";
import { useDroppable } from "@dnd-kit/core";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Connection,
  EdgeChange,
  NodeChange,
  ReactFlow,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  ReactFlowProvider,
  reconnectEdge,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { memo, useCallback, useContext, useEffect, useRef } from "react";
import AppNode from "./nodes/app-node/app-node";
import "./theme.css";

export default function CanvasView({
  config,
  isActive,
  tabName,
}: {
  config: CanvasViewConfig;
  isActive: boolean;
  tabName: string;
}) {
  const editorContext = useContext(EditorContext);

  const { resolvedTheme } = useTheme();
  const {
    localEdges,
    localNodes,
    entryPoint,
    startWorkflow,
    updateWorkflowEdges,
    updateWorkflowNodes,
    exportWorkflow,
    saveAppsSnapshotStates,
  } = useCanvasWorkflow(config.initialWorkflowContent);
  const viewport = useViewport();
  const { screenToFlowPosition } = useReactFlow();
  const { deleteAppViewInCanvasView } = useTabViewManager();
  const { getViewCenterCoordForNode } = useCanvas();

  const containerRef = useRef<HTMLDivElement>(null);

  // this is called when new node is added below using updateWorkflowNodes
  const onNodesChange = useCallback(
    (changes: NodeChange<ReactFlowNode<AppNodeData>>[]) =>
      updateWorkflowNodes((oldNodes) => applyNodeChanges(changes, oldNodes)),
    [updateWorkflowNodes],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<{ id: string; source: string; target: string }>[]) =>
      updateWorkflowEdges((oldEdges) => applyEdgeChanges(changes, oldEdges)),
    [updateWorkflowEdges],
  );
  const onConnect = useCallback(
    (params: any) =>
      updateWorkflowEdges((oldEdges) => addEdge(params, oldEdges)),
    [updateWorkflowEdges],
  );
  const onReconnect = useCallback(
    (oldEdge: ReactFlowEdge, newConnection: Connection) =>
      updateWorkflowEdges((oldEdges) =>
        reconnectEdge(oldEdge, newConnection, oldEdges),
      ),
    [updateWorkflowEdges],
  );
  const onDelete = useCallback(
    async ({
      nodes,
      edges,
    }: {
      nodes: ReactFlowNode<AppNodeData>[];
      edges: ReactFlowEdge[];
    }) => {
      if (nodes.length > 0) {
        // Delete all edges connected to the deleted nodes
        const connectedEdgeIds = new Set<string>();
        edges.forEach((edge) => {
          if (nodes.find((node) => node.id === edge.source)) {
            connectedEdgeIds.add(edge.id);
          }
          if (nodes.find((node) => node.id === edge.target)) {
            connectedEdgeIds.add(edge.id);
          }
        });

        // Delete connected edges
        updateWorkflowEdges((oldEdges) =>
          oldEdges.filter((edge) => !connectedEdgeIds.has(edge.id)),
        );

        // Delete nodes
        const deleteNodePromises = nodes.map(async (node) => {
          await deleteAppViewInCanvasView(node.data.config.viewId);
        });
        await Promise.all(deleteNodePromises);
      }

      if (edges.length > 0) {
        updateWorkflowEdges((oldEdges) =>
          oldEdges.filter(
            (edge) => !edges.find((deletedEdge) => deletedEdge.id === edge.id),
          ),
        );
      }
    },
    [updateWorkflowEdges, updateWorkflowNodes],
  );

  /* Node creator functions */
  const createAppNode = useCallback((props: any) => {
    return <AppNode {...props} />;
  }, []);

  /* Register menu actions */
  // Export workflow
  useRegisterMenuAction(
    {
      name: `Export Workflow (${tabName})`,
      menuCategory: "file",
      description: "Export the current workflow as a JSON file",
      shortcut: "Ctrl+Alt+E",
      icon: "download",
    },
    async () => exportWorkflow(),
    [exportWorkflow, isActive, tabName],
    isActive,
  );
  // Run workflow
  useRegisterMenuAction(
    {
      name: `Run Workflow (${tabName})`,
      menuCategory: "view",
      description:
        "Run the current workflow from the selected or default entry point",
      shortcut: "Ctrl+Alt+R",
      icon: "play_arrow",
    },
    async () => {
      await startWorkflow();
    },
    [entryPoint, isActive, tabName, editorContext?.persistSettings?.extensions],
    isActive,
  );
  // Publish workflow
  useRegisterMenuAction(
    {
      name: `Publish Workflow (${tabName})`,
      menuCategory: "file",
      description: "Publish the current workflow to the Pulse Marketplace",
      shortcut: "Ctrl+Alt+P",
      icon: "cloud_upload",
    },
    async () => {
      editorContext?.updateModalStates({
        publishWorkflow: {
          isOpen: true,
          workflowCanvas: containerRef.current,
          localNodes: editorContext?.editorStates.workflowNodes,
          localEdges: editorContext?.editorStates.workflowEdges,
          entryPoint: entryPoint,
          saveAppsSnapshotStates: saveAppsSnapshotStates,
        },
      });
    },
    [
      isActive,
      tabName,
      editorContext?.editorStates.workflowEdges,
      editorContext?.editorStates.workflowNodes,
      entryPoint,
      saveAppsSnapshotStates,
    ],
    isActive,
  );

  const { setNodeRef, isOver, active } = useDroppable({
    id: "canvas-view-" + config.viewId,
  });

  // Watch container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;

    const observer = new ResizeObserver((entries) => {
      const bounds = containerRef.current?.getBoundingClientRect();

      if (!bounds) return;

      editorContext?.setEditorStates((prev) => ({
        ...prev,
        canvasSize: {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
        },
      }));
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    console.log("CanvasView active droppable:", active);
  }, [active]);

  // Promote nodes to workflow nodes,
  // or remove workflow nodes that are no longer in the config
  useEffect(() => {
    function promoteToWorkflowNode(newApps: AppViewConfig[]) {
      const newNodes: ReactFlowNode<AppNodeData>[] =
        newApps?.map((appConfig) => {
          const viewCenter = getViewCenterCoordForNode(
            appConfig.initialWidth ?? 640,
            appConfig.initialHeight ?? 360,
            viewport.zoom,
          );

          const newAppNodeData: AppNodeData = {
            config: appConfig,
            selectedAction: undefined,
            isRunning: false,
            isShowingWorkflowConnector:
              config.initialWorkflowContent?.nodes.find(
                (n) => n.id === appConfig.viewId,
              )?.data.isShowingWorkflowConnector ?? false,
            ownedAppViews: {}, // Initially no owned apps
            isFullscreen: appConfig.initialIsFullscreen ?? false,
          };

          return {
            id: appConfig.viewId,
            position: viewCenter,
            data: newAppNodeData,
            type: "appNode",
            height: appConfig.initialHeight ?? 360,
            width: appConfig.initialWidth ?? 640,
          };
        }) ?? [];

      // Add new nodes to the workflow
      updateWorkflowNodes((oldNodes) => oldNodes.concat(newNodes));
    }

    function removeWorkflowNode(removedNodes: ReactFlowNode<AppNodeData>[]) {
      updateWorkflowNodes((oldNodes) => {
        return oldNodes.filter(
          (node) =>
            !removedNodes.find((removedNode) => removedNode.id === node.id),
        );
      });
    }

    if (config) {
      // Added apps
      const addedApps = config.appConfigs?.filter(
        (app) => !localNodes.find((node) => node.id === app.viewId),
      );

      if (addedApps && addedApps.length > 0) {
        promoteToWorkflowNode(addedApps);
      }

      // Removed apps
      const removedApps = localNodes.filter(
        (node) =>
          !config.appConfigs?.find((newNode) => newNode.viewId === node.id),
      );

      if (removedApps && removedApps.length > 0) {
        removeWorkflowNode(removedApps);
      }
    }
  }, [config, viewport, screenToFlowPosition, updateWorkflowNodes]);

  return (
    <div
      ref={setNodeRef}
      id={config.viewId}
      className="bg-content3 text-content3-foreground relative h-full w-full"
      style={{
        opacity:
          isOver && active?.id.toString().startsWith("draggable-app-")
            ? 0.5
            : 1,
      }}
    >
      <div ref={containerRef} className="relative h-full w-full">
        <ReactFlow
          nodes={localNodes ?? []}
          edges={localEdges ?? []}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          proOptions={{
            hideAttribution: true,
          }}
          nodeTypes={{
            appNode: createAppNode,
          }}
          deleteKeyCode={["Delete", "Backspace"]}
          onDelete={onDelete}
          onReconnect={onReconnect}
          defaultEdgeOptions={{
            markerEnd: {
              type: "arrowclosed",
            },
            style: {
              strokeWidth: 2,
            },
          }}
          maxZoom={4}
          minZoom={0.1}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        >
          <Background id={config.viewId} variant={BackgroundVariant.Dots} />
        </ReactFlow>
      </div>
    </div>
  );
}

export const MemoizedCanvasView = memo(
  ({
    config,
    isActive,
    tabName,
  }: {
    config: CanvasViewConfig;
    isActive: boolean;
    tabName: string;
  }) => (
    <ReactFlowProvider>
      <CanvasView config={config} isActive={isActive} tabName={tabName} />
    </ReactFlowProvider>
  ),
);
MemoizedCanvasView.displayName = "MemoizedCanvasView";
