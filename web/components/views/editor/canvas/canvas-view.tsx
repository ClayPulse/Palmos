import { EditorContext } from "@/components/providers/editor-context-provider";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useCanvas } from "@/lib/hooks/use-canvas";
import useCanvasWorkflow from "@/lib/hooks/use-canvas-workflow";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  AppNodeData,
  AppViewConfig,
  CanvasViewConfig,
  CopiedCanvasSelection,
} from "@/lib/types";
import { createAppViewId } from "@/lib/views/view-helpers";
import { useDroppable } from "@dnd-kit/core";
import { addToast } from "@heroui/react";
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

function createCopiedEdgeId(source: string, target: string) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${source}-${target}-${suffix}`;
}

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
  const { getTranslations: t, locale } = useTranslations();

  const { resolvedTheme } = useTheme();
  const {
    localEdges,
    localNodes,
    entryPoint,
    startWorkflow,
    startWorkflowFromNode,
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

  const copiedSelection = editorContext?.editorStates.canvasClipboard;
  const setCopiedSelection = (selection: CopiedCanvasSelection) => {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      canvasClipboard: selection,
    }));
  };

  // Refs so the keydown handler always reads the latest nodes/edges without
  // needing them in the useEffect deps (which would re-register the handler
  // on every paste, potentially losing the clipboard reference mid-operation).
  const localNodesRef = useRef(localNodes);
  localNodesRef.current = localNodes;
  const localEdgesRef = useRef(localEdges);
  localEdgesRef.current = localEdges;

  // Maps viewId -> flow position for nodes being pasted, so promoteToWorkflowNode
  // can place them at the correct location instead of defaulting to canvas center.
  // NOTE: These must stay as refs — they are written during paste and read synchronously
  // in the promoteToWorkflowNode effect; state updates are async and would break that handshake.
  const pastePositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  // Stores full pasted node snapshots so config-sync promotion preserves node data.
  const pastedNodesRef = useRef<Map<string, ReactFlowNode<AppNodeData>>>(
    new Map(),
  );

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
        for (const node of nodes) {
          await deleteAppViewInCanvasView(node.data.config.viewId);
        }
      }

      if (edges.length > 0) {
        updateWorkflowEdges((oldEdges) =>
          oldEdges.filter(
            (edge) => !edges.find((deletedEdge) => deletedEdge.id === edge.id),
          ),
        );
      }
    },
    [updateWorkflowEdges, updateWorkflowNodes, deleteAppViewInCanvasView],
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
      displayName: `${t("fileMenu.exportWorkflow.name")} (${tabName})`,
      menuCategory: "file",
      description: t("fileMenu.exportWorkflow.description"),
      shortcut: "Ctrl+Alt+E",
      icon: "download",
    },
    async () => exportWorkflow(),
    [exportWorkflow, isActive, tabName, locale],
    isActive,
  );
  // Run workflow
  useRegisterMenuAction(
    {
      name: `Run Workflow (${tabName})`,
      displayName: `${t("viewMenu.runWorkflow.name")} (${tabName})`,
      menuCategory: "view",
      description: t("viewMenu.runWorkflow.description"),
      shortcut: "Ctrl+Alt+R",
      icon: "play_arrow",
    },
    async () => {
      await startWorkflow();
    },
    [
      entryPoint,
      isActive,
      tabName,
      editorContext?.persistSettings?.extensions,
      locale,
    ],
    isActive,
  );
  // Run workflow from selected node (forward-only, no upstream backtrack)
  useRegisterMenuAction(
    {
      name: `Run From Selected Node (${tabName})`,
      displayName: `${t("viewMenu.runFromSelectedNode.name")} (${tabName})`,
      menuCategory: "view",
      description: t("viewMenu.runFromSelectedNode.description"),
      shortcut: "Ctrl+Alt+Shift+R",
      icon: "skip_next",
    },
    async () => {
      await startWorkflowFromNode();
    },
    [
      entryPoint,
      isActive,
      tabName,
      editorContext?.persistSettings?.extensions,
      locale,
    ],
    isActive,
  );
  // Publish workflow
  useRegisterMenuAction(
    {
      name: `Publish Workflow (${tabName})`,
      displayName: `${t("fileMenu.publishWorkflow.name")} (${tabName})`,
      menuCategory: "file",
      description: t("fileMenu.publishWorkflow.description"),
      shortcut: "Ctrl+Alt+P",
      icon: "cloud_upload",
    },
    async () => {
      const tabView = editorContext?.editorStates.tabViews.find(
        (v) => (v.config as CanvasViewConfig).viewId === config.viewId,
      );
      editorContext?.updateModalStates({
        publishWorkflow: {
          isOpen: true,
          workflowCanvas: containerRef.current,
          localNodes: editorContext?.editorStates.workflowNodes,
          localEdges: editorContext?.editorStates.workflowEdges,
          entryPoint: entryPoint,
          saveAppsSnapshotStates: saveAppsSnapshotStates,
          openedWorkflow: tabView?.openedWorkflow,
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
      locale,
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

  // Copy-paste handler for canvas nodes (Ctrl+C / Ctrl+V)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey && e.key === "c") {
        const selected = localNodesRef.current.filter((n) => n.selected);
        if (selected.length === 0) return;
        const selectedNodeIds = new Set(selected.map((node) => node.id));
        // Store node references directly — ReactFlow nodes contain non-serializable
        // internal fields (e.g. internals.domNode), so we must NOT structuredClone them.
        setCopiedSelection({
          nodes: selected,
          edges: localEdgesRef.current
            .filter(
              (edge) =>
                selectedNodeIds.has(edge.source) &&
                selectedNodeIds.has(edge.target),
            )
            .map((edge) => ({ ...edge })),
        });
        const names = selected.map((n) => n.data.config.app).join(", ");
        addToast({
          title: `Copied ${selected.length} node${selected.length > 1 ? "s" : ""}`,
          description: `Copied: ${names}`,
          color: "success",
        });
      } else if (e.ctrlKey && e.key === "v" && copiedSelection) {
        const { nodes: copiedNodes, edges: copiedEdges } = copiedSelection;
        if (!copiedNodes || copiedNodes.length === 0) return;

        // Compute bounding-box center of the copied selection (flow coordinates)
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const node of copiedNodes) {
          const w = node.width ?? node.data.config.initialWidth ?? 640;
          const h = node.height ?? node.data.config.initialHeight ?? 360;
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          maxX = Math.max(maxX, node.position.x + w);
          maxY = Math.max(maxY, node.position.y + h);
        }
        const selCenterX = (minX + maxX) / 2;
        const selCenterY = (minY + maxY) / 2;

        // Compute current canvas center in flow coordinates
        const containerEl = containerRef.current;
        const canvasCenter = containerEl
          ? screenToFlowPosition({
              x:
                containerEl.getBoundingClientRect().left +
                containerEl.offsetWidth / 2,
              y:
                containerEl.getBoundingClientRect().top +
                containerEl.offsetHeight / 2,
            })
          : { x: selCenterX, y: selCenterY };

        const dx = canvasCenter.x - selCenterX;
        const dy = canvasCenter.y - selCenterY;
        const nodeIdMap = new Map<string, string>();

        const pasteItems = copiedNodes.map((node) => {
          const newViewId = createAppViewId(node.data.config.app);
          nodeIdMap.set(node.id, newViewId);

          const newAppConfig: AppViewConfig = {
            ...node.data.config,
            viewId: newViewId,
          };
          const pastePosition = {
            x: node.position.x + dx,
            y: node.position.y + dy,
          };
          // Register position so promoteToWorkflowNode uses it if it fires
          // before localNodes has been updated with the pasted node.
          pastePositionsRef.current.set(newViewId, pastePosition);
          const newNode: ReactFlowNode<AppNodeData> = {
            ...node,
            id: newViewId,
            selected: false,
            position: pastePosition,
            data: {
              ...node.data,
              config: newAppConfig,
              isRunning: false,
            },
          };
          pastedNodesRef.current.set(newViewId, newNode);
          return { newNode, newAppConfig };
        });

        const newEdges = copiedEdges.flatMap((edge) => {
          const newSource = nodeIdMap.get(edge.source);
          const newTarget = nodeIdMap.get(edge.target);

          if (!newSource || !newTarget) {
            return [];
          }

          return [
            {
              ...edge,
              id: createCopiedEdgeId(newSource, newTarget),
              source: newSource,
              target: newTarget,
              selected: false,
            },
          ];
        });

        // Insert nodes at correct positions before the config-sync effect can
        // strip them (nodes not in config.appConfigs get removed by that effect).
        updateWorkflowNodes((oldNodes) => [
          ...oldNodes,
          ...pasteItems.map((p) => p.newNode),
        ]);
        updateWorkflowEdges((oldEdges) => [...oldEdges, ...newEdges]);

        // Register new app configs in the canvas config so the cleanup effect
        // does not remove the freshly-pasted nodes on the next config change.
        editorContext?.setEditorStates((prev) => {
          const currentTab = prev.tabViews[prev.tabIndex];
          const newCanvasConfig: CanvasViewConfig = {
            ...(currentTab.config as CanvasViewConfig),
            appConfigs: [
              ...((currentTab.config as CanvasViewConfig).appConfigs ?? []),
              ...pasteItems.map((p) => p.newAppConfig),
            ],
          };
          const newViews = [...prev.tabViews];
          newViews[prev.tabIndex] = {
            ...currentTab,
            config: newCanvasConfig,
          };
          return { ...prev, tabViews: newViews };
        });

        const count = pasteItems.length;
        addToast({
          title: `Pasted ${count} node${count > 1 ? "s" : ""} successfully`,
          description: `${count} node${count > 1 ? "s" : ""} added to canvas.`,
          color: "success",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    copiedSelection,
    isActive,
    screenToFlowPosition,
    updateWorkflowEdges,
    updateWorkflowNodes,
  ]);

  // Promote nodes to workflow nodes,
  // or remove workflow nodes that are no longer in the config
  useEffect(() => {
    function promoteToWorkflowNode(newApps: AppViewConfig[]) {
      const newNodes: ReactFlowNode<AppNodeData>[] =
        newApps?.map((appConfig) => {
          const pastedNode = pastedNodesRef.current.get(appConfig.viewId);
          if (pastedNode) {
            pastedNodesRef.current.delete(appConfig.viewId);
            pastePositionsRef.current.delete(appConfig.viewId);

            return {
              ...pastedNode,
              data: {
                ...pastedNode.data,
                config: appConfig,
                isRunning: false,
              },
            };
          }

          // Priority: 1) pasted position, 2) saved workflow position, 3) canvas center
          const pastePosition = pastePositionsRef.current.get(appConfig.viewId);
          pastePositionsRef.current.delete(appConfig.viewId);

          const savedNode = config.initialWorkflowContent?.nodes.find(
            (n) => n.id === appConfig.viewId,
          );
          const position =
            pastePosition ??
            savedNode?.position ??
            getViewCenterCoordForNode(
              appConfig.initialWidth ?? 640,
              appConfig.initialHeight ?? 360,
              viewport.zoom,
            );

          const newAppNodeData: AppNodeData = {
            config: appConfig,
            selectedAction: undefined,
            isRunning: false,
            isShowingWorkflowConnector:
              savedNode?.data.isShowingWorkflowConnector ?? false,
            ownedAppViews: {}, // Initially no owned apps
            isFullscreen: appConfig.initialIsFullscreen ?? false,
          };

          return {
            id: appConfig.viewId,
            position,
            data: newAppNodeData,
            type: "appNode",
            height: savedNode?.height ?? appConfig.initialHeight ?? 360,
            width: savedNode?.width ?? appConfig.initialWidth ?? 640,
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
