import { useAppInfo } from "@/lib/hooks/use-app-info";
import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import { AppInfoModalContent, CanvasViewConfig, MenuAction } from "@/lib/types";
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

export default function CanvasView({ config }: { config?: CanvasViewConfig }) {
  const { openAppInfoModal } = useAppInfo();
  const { registerMenuAction, unregisterMenuAction } = useMenuActions();

  const viewport = useViewport();
  const { screenToFlowPosition } = useReactFlow();

  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<ReactFlowNode[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);

  const onNodesChange = useCallback((changes: NodeChange<ReactFlowNode>[]) => {
    console.log("Node changes:", changes);
    setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
  }, []);
  const onEdgesChange = useCallback(
    (changes: EdgeChange<{ id: string; source: string; target: string }>[]) => {
      console.log("Edge changes:", changes);
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot));
    },
    [],
  );
  const onConnect = useCallback(
    (params: any) =>
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );
  const onReconnect = useCallback(
    (oldEdge: ReactFlowEdge, newConnection: Connection) =>
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [],
  );

  /* Node creator functions */
  const createAppNode = useCallback((props: any) => {
    return <AppNode {...props} />;
  }, []);

  // Register menu actions
  useEffect(() => {
    console.log("CanvasView rendered: registering menu actions");

    const menuActions: MenuAction[] = [
      {
        name: "Export Workflow",
        menuCategory: "file",
        description: "Export the current workflow as a JSON file",
        shortcut: "Ctrl+Alt+E",
        actionFunc: async () => {
          await exportWorkflow();
        },
        icon: "download",
      },
      {
        name: "Import Workflow",
        menuCategory: "file",
        description: "Import a workflow from a JSON file",
        shortcut: "Ctrl+Alt+I",
        actionFunc: async () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/json";
          input.onchange = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const workflow = JSON.parse(event.target?.result as string);
                if (workflow.nodes && workflow.edges) {
                  setNodes(workflow.nodes);
                  setEdges(workflow.edges);
                } else {
                  alert("Invalid workflow file");
                }
              } catch (err) {
                alert("Error reading workflow file");
              }
            };
            reader.readAsText(file);
          };
          input.click();
        },
        icon: "upload",
      },
    ];

    menuActions.forEach((action) => {
      registerMenuAction(action);
    });

    return () => {
      // Unregister menu actions on unmount
      menuActions.forEach((action) => {
        unregisterMenuAction(action);
      });
    };
  }, []);

  useEffect(() => {
    if (config) {
      // Added nodes
      const newNodes = config.nodes?.filter(
        (newNode) => !nodes.find((node) => node.id === newNode.viewId),
      );

      if (newNodes && newNodes.length > 0) {
        const newAppNodes: ReactFlowNode[] =
          newNodes?.map((appConfig) => {
            const containerBounds =
              containerRef.current?.getBoundingClientRect();

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

            return {
              id: appConfig.viewId,
              position: flowCenter,
              data: {
                label: appConfig.app,
                config: appConfig,
              },
              type: "appNode",
              height: appConfig.recommendedHeight ?? 360,
              width: appConfig.recommendedWidth ?? 640,
            };
          }) ?? [];

        setNodes((nds) => nds.concat(newAppNodes));
      }

      // Removed nodes
      const removedNodes = nodes.filter(
        (node) => !config.nodes?.find((newNode) => newNode.viewId === node.id),
      );

      if (removedNodes && removedNodes.length > 0) {
        setNodes((nds) =>
          nds.filter(
            (node) =>
              !removedNodes.find((removedNode) => removedNode.id === node.id),
          ),
        );
      }
    }
  }, [config, viewport]);

  async function exportWorkflow() {
    const workflow = { nodes, edges };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      ref={containerRef}
      className="bg-content3 text-content3-foreground relative h-full w-full"
      id={`canvas-${config?.viewId}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
            width: 20,
            height: 20,
          },
        }}
      >
        <Background variant={BackgroundVariant.Dots} />
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
    </div>
  );
}
