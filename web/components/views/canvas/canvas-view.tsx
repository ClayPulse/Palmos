import PublishWorkflowModal from "@/components/modals/publish-workflow-modal";
import { useRegisterMenuAction } from "@/lib/hooks/menu-actions/use-register-menu-action";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import useCanvasWorkflow from "@/lib/hooks/use-canvas-workflow";
import {
  AppInfoModalContent,
  AppNodeData,
  AppViewConfig,
  CanvasViewConfig,
} from "@/lib/types";
import { Button } from "@heroui/react";
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
import { useCallback, useEffect, useRef, useState } from "react";
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
  const { openAppInfoModal } = useAppInfo();

  const {
    localEdges,
    localNodes,
    entryPoint,
    startWorkflow,
    updateWorkflowEdges,
    updateWorkflowNodes,
    exportWorkflow,
  } = useCanvasWorkflow(config.initialWorkflow);

  const viewport = useViewport();
  const { screenToFlowPosition } = useReactFlow();

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
    [entryPoint, isActive, tabName],
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
              config.initialWorkflow?.content.nodes.find(
                (n) => n.id === appConfig.viewId,
              )?.data.isShowingWorkflowConnector ?? false,
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
        onReconnect={onReconnect}
        defaultEdgeOptions={{
          markerEnd: {
            type: "arrowclosed",
          },
          style: {
            strokeWidth: 2,
          },
        }}
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
      />
    </div>
  );
}
