import PublishWorkflowModal from "@/components/modals/publish-workflow-modal";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { DragEventTypeEnum } from "@/lib/enums";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import useCanvasWorkflow from "@/lib/hooks/use-canvas-workflow";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import {
  AppDragData,
  AppInfoModalContent,
  AppNodeData,
  AppViewConfig,
  CanvasViewConfig,
  ExtensionApp,
} from "@/lib/types";
import { addToast, Button } from "@heroui/react";
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
  reconnectEdge,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 } from "uuid";
import Icon from "../../misc/icon";
import AppNode from "./nodes/app-node/app-node";
import "./theme.css";

const appInfo: AppInfoModalContent = {
  name: "Pulse Editor",
  version: "1.0.0",
  author: "ClayPulse",
  license: "MIT",
  url: "https://pulse-editor.com",
  readme: `\
# Pulse Editor

Pulse Editor is a modular, cross-platform, AI-powered creativity platform with federated app collaboration and extensible workflows.

# Acknowledgements
- Thanks to the developers and community of [Module Federation](https://module-federation.io/) for their groundbreaking work on micro-frontends.
- Thanks to the developers and community of [Hero UI](https://www.heroui.com/) for their fantastic component library.
- Thanks to the developers and community of [React Flow](https://reactflow.dev/) for their amazing node-based graph library.
`,
};

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

  const { openAppInfoModal } = useAppInfo();
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
  const { deleteAppViewInCanvasView, createAppViewInCanvasView } =
    useTabViewManager();

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

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
      setIsPublishModalOpen(true);
    },
    [isActive, tabName],
    isActive,
  );

  // Promote nodes to workflow nodes,
  // or remove workflow nodes that are no longer in the config
  useEffect(() => {
    function promoteToWorkflowNode(newApps: AppViewConfig[]) {
      const newNodes: ReactFlowNode<AppNodeData>[] =
        newApps?.map((appConfig) => {
          const flowCenter = getViewCenter(appConfig);

          const newAppNodeData: AppNodeData = {
            config: appConfig,
            selectedAction: undefined,
            isRunning: false,
            isShowingWorkflowConnector:
              config.initialWorkflowContent?.nodes.find(
                (n) => n.id === appConfig.viewId,
              )?.data.isShowingWorkflowConnector ?? false,
            ownedApps: {}, // Initially no owned apps
          };

          return {
            id: appConfig.viewId,
            position: flowCenter,
            data: newAppNodeData,
            type: "appNode",
            height: appConfig.recommendedHeight ?? 360,
            width: appConfig.recommendedWidth ?? 640,
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

    function getViewCenter(appConfig: AppViewConfig) {
      const containerBounds = containerRef.current?.getBoundingClientRect();

      if (!containerBounds) throw new Error("Container bounds not found");

      const screenCenter = {
        x:
          containerBounds.left +
          containerBounds.width / 2 -
          ((appConfig.recommendedWidth ?? 640) / 2) * viewport.zoom,
        y:
          containerBounds.top +
          containerBounds.height / 2 -
          ((appConfig.recommendedHeight ?? 360) / 2) * viewport.zoom,
      };

      const flowCenter = screenToFlowPosition(screenCenter);
      return flowCenter;
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
      ref={containerRef}
      className="bg-content3 text-content3-foreground relative h-full w-full"
      id={config.viewId}
      onDragOver={(e) => {
        const types = e.dataTransfer.types;
        if (
          types.includes(`application/${DragEventTypeEnum.App.toLowerCase()}`)
        ) {
          e.preventDefault(); // allow drop
          e.dataTransfer.dropEffect = "copy";
        } else {
          e.dataTransfer.dropEffect = "none";
        }
      }}
      onDrop={(e) => {
        const dataText = e.dataTransfer.getData(
          `application/${DragEventTypeEnum.App.toLowerCase()}`,
        );
        if (!dataText) {
          return;
        }
        console.log("Dropped item:", dataText);
        try {
          const data = JSON.parse(dataText) as AppDragData;
          e.preventDefault();

          const app: ExtensionApp = data.app;
          const config: AppViewConfig = {
            app: app.config.id,
            viewId: `${app.config.id}-${v4()}`,
            recommendedHeight: app.config.recommendedHeight,
            recommendedWidth: app.config.recommendedWidth,
          };
          createAppViewInCanvasView(config);
        } catch (error) {
          addToast({
            title: "Failed to open app",
            description: "The dropped app data is invalid.",
            color: "danger",
          });
        }
      }}
    >
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
      <Button
        isIconOnly
        className="absolute right-2 bottom-2"
        variant="light"
        onPress={() => {
          openAppInfoModal(appInfo);
        }}
      >
        <Icon name="info" />
      </Button>

      <PublishWorkflowModal
        isOpen={isPublishModalOpen}
        setIsOpen={setIsPublishModalOpen}
        workflowCanvas={containerRef.current}
        localNodes={localNodes}
        localEdges={localEdges}
        entryPoint={entryPoint}
        saveAppsSnapshotStates={saveAppsSnapshotStates}
      />
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
  }) => <CanvasView config={config} isActive={isActive} tabName={tabName} />,
);
MemoizedCanvasView.displayName = "MemoizedCanvasView";
